(function () {
  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const messages = document.getElementById('aiChatMessages');
  const typing = document.getElementById('aiTypingIndicator');

  if (!input || !sendBtn || !messages) return;
  if (window.__ALADL_GROQ_ASSISTANT_READY__) return;
  window.__ALADL_GROQ_ASSISTANT_READY__ = true;


  const style = document.createElement('style');
  style.textContent = `
    .ai-message.bot p{margin:6px 0;line-height:1.8}
    .ai-card{background:#fff;border:1px solid #eee;border-radius:14px;padding:10px 12px;margin:9px 0;box-shadow:0 4px 14px rgba(0,0,0,.06);text-align:right;line-height:1.7}
    .ai-card b{display:block;color:#6b1f3a;font-size:15px;margin-bottom:5px}
    .ai-price{font-weight:700;color:#28334d;margin:4px 0}.ai-price.muted{color:#777;font-weight:600}
    .ai-specs{font-size:13px;color:#5d677a;margin:5px 0}
    .ai-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .ai-btn{display:inline-block;background:#8d2d57;color:#fff!important;text-decoration:none;border:0;cursor:pointer;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:700;margin:6px 5px 0 0}
    .ai-btn.ai-wa{background:#25D366;color:#073b1d!important}.ai-note{font-size:12px;color:#777}.ai-list{background:#f8f4f6;border-radius:12px;padding:9px;margin:7px 0;line-height:1.9}
  `;
  document.head.appendChild(style);

  const STORAGE_KEY = 'alAdlGroqAssistantHistoryV3';
  let history = [];

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) history = saved.slice(-8);
  } catch (e) {}

  function saveHistory() {
    try {
      const data = JSON.stringify(history.slice(-12));
      localStorage.setItem(STORAGE_KEY, data);
      sessionStorage.setItem(STORAGE_KEY, data);
    } catch (e) {}
  }

  function addMessage(content, sender, isHtml) {
    const div = document.createElement('div');
    div.className = 'ai-message ' + (sender === 'user' ? 'user' : 'bot');
    if (isHtml) {
      div.innerHTML = String(content || '');
    } else {
      div.textContent = String(content || '');
    }
    messages.insertBefore(div, typing || null);
    messages.scrollTop = messages.scrollHeight;
  }


  // استرجاع المحادثة عند الانتقال بين صفحات الموقع بدل أن تبدأ من جديد
  if (history.length) {
    history.forEach(function (m) {
      addMessage(m.content, m.role === 'user' ? 'user' : 'bot', false);
    });
  }

  messages.addEventListener('click', function(event){
    const btn = event.target.closest('[data-goto]');
    if (!btn) return;
    event.preventDefault();
    const url = btn.getAttribute('data-goto');
    if (url) window.location.assign(url);
  });

  function setLoading(isLoading) {
    if (typing) typing.classList.toggle('active', !!isLoading);
    sendBtn.disabled = !!isLoading;
    input.disabled = !!isLoading;
  }

  async function askGroq(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    }

    const text = input.value.trim();
    if (!text) return false;

    input.value = '';
    addMessage(text, 'user', false);
    history.push({ role: 'user', content: text });
    history = history.slice(-8);
    saveHistory();
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          pageTitle: document.title,
          pageUrl: window.location.href
        })
      });

      const data = await response.json().catch(function () { return {}; });
      const reply = data.reply || data.fallback || 'حصل ضغط مؤقت. حاول مرة أخرى بعد لحظات.';
      const isHtml = data.format === 'html' || /<\/?(p|div|a|button|br|b|strong)/i.test(reply);
      addMessage(reply, 'bot', isHtml);
      history.push({ role: 'assistant', content: isHtml ? reply.replace(/<[^>]*>/g, ' ') : reply });
      history = history.slice(-8);
      saveHistory();
    } catch (e) {
      addMessage('حصل خطأ مؤقت. حاول مرة أخرى بعد لحظات.', 'bot', false);
    } finally {
      setLoading(false);
      input.focus();
    }

    return false;
  }

  sendBtn.addEventListener('click', askGroq, true);
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter') askGroq(event); }, true);
  input.addEventListener('keypress', function (event) { if (event.key === 'Enter') askGroq(event); }, true);
})();
