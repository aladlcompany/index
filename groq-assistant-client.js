(function () {
  const panel = document.getElementById('aiChatPanel');
  const bubble = document.getElementById('aiBubble');
  const closeBtn = document.getElementById('aiCloseBtn');
  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const messages = document.getElementById('aiChatMessages');
  const typing = document.getElementById('aiTypingIndicator');
  const overlay = document.createElement('div');
  overlay.className = 'ai-site-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  if (!panel || !bubble || !input || !sendBtn || !messages) return;
  if (window.__ALADL_GROQ_ASSISTANT_READY__) return;
  window.__ALADL_GROQ_ASSISTANT_READY__ = true;

  function openChat(event) {
    if (event) event.stopPropagation();
    panel.classList.add('active');
    bubble.classList.add('active');
    document.body.classList.add('ai-chat-open');
    overlay.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(function () { input.focus(); }, 120);
  }

  function closeChat(event) {
    if (event) event.stopPropagation();
    panel.classList.remove('active');
    bubble.classList.remove('active');
    document.body.classList.remove('ai-chat-open');
    overlay.classList.remove('active');
    panel.setAttribute('aria-hidden', 'true');
  }

  bubble.addEventListener('click', openChat);
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  overlay.addEventListener('click', closeChat);
  document.addEventListener('pointerdown', function (event) {
    if (!panel.classList.contains('active')) return;
    if (panel.contains(event.target) || bubble.contains(event.target)) return;
    closeChat(event);
  }, true);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeChat(event);
  });


  const style = document.createElement('style');
  style.textContent = `
    .ai-message.bot p{margin:6px 0;line-height:1.8}
    .ai-card{background:#fff;border:1px solid #eee;border-radius:14px;padding:10px 12px;margin:9px 0;box-shadow:0 4px 14px rgba(0,0,0,.06);text-align:right;line-height:1.7}
    .ai-card b{display:block;color:#6b1f3a;font-size:15px;margin-bottom:5px}
    .ai-price{font-weight:700;color:#28334d;margin:4px 0}.ai-price.muted{color:#777;font-weight:600}
    .ai-specs{font-size:13px;color:#5d677a;margin:5px 0}
    .ai-site-overlay{position:fixed;inset:0;z-index:998;background:rgba(255,255,255,.14);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .22s ease}
    .ai-site-overlay.active{opacity:1;pointer-events:auto}
    #aiChatPanel{z-index:1000!important}#aiBubble{z-index:1001!important}
    #aiBubble.ai-attention{animation:aiAttention 1.1s ease-in-out 0s 3, aiGlow 1.8s ease-in-out 0s 2}
    @keyframes aiAttention{0%,100%{transform:translateY(0) scale(1)}20%{transform:translateY(-8px) scale(1.05)}40%{transform:translateY(0) scale(.98)}60%{transform:translateY(-5px) scale(1.03)}80%{transform:translateY(0) scale(1)}}
    @keyframes aiGlow{0%,100%{box-shadow:0 10px 25px rgba(141,45,87,.25)}50%{box-shadow:0 0 0 10px rgba(141,45,87,.12),0 16px 34px rgba(141,45,87,.35)}}
    .ai-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    .ai-btn{display:inline-block;background:#8d2d57;color:#fff!important;text-decoration:none;border:0;cursor:pointer;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:700;margin:6px 5px 0 0}
    .ai-btn.ai-wa{background:#25D366;color:#073b1d!important}.ai-note{font-size:12px;color:#777}.ai-list{background:#f8f4f6;border-radius:12px;padding:9px;margin:7px 0;line-height:1.9}
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  let chimePlayed = false;
  function playAssistantChime() {
    if (chimePlayed) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
      chimePlayed = true;
    } catch (e) {}
  }

  function attractAttention() {
    bubble.classList.add('ai-attention');
    playAssistantChime();
    setTimeout(function () { bubble.classList.remove('ai-attention'); }, 3800);
  }

  setTimeout(attractAttention, 700);
  window.addEventListener('pointerdown', playAssistantChime, { once: true, passive: true });

  const STORAGE_KEY = 'alAdlGroqAssistantHistoryV4_SESSION';
  let history = [];
  let isSending = false;

  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) history = saved.slice(-8);
  } catch (e) {}

  function saveHistory() {
    try {
      const data = JSON.stringify(history.slice(-12));
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
    if (!text || isSending) return false;
    isSending = true;

    const requestHistory = history.slice(-8); // السياق قبل الرسالة الحالية فقط
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
          history: requestHistory,
          pageTitle: document.title,
          pageUrl: window.location.href
        })
      });

      const data = await response.json().catch(function () { return {}; });
      const reply = data.reply || data.fallback || 'حصل ضغط مؤقت. حاول مرة أخرى بعد لحظات.';
      if (data.debug && window.console) console.info('ElAdl assistant:', data.debug);
      const isHtml = data.format === 'html' || /<\/?(p|div|a|button|br|b|strong)/i.test(reply);
      addMessage(reply, 'bot', isHtml);
      history.push({ role: 'assistant', content: isHtml ? reply.replace(/<[^>]*>/g, ' ') : reply });
      history = history.slice(-8);
      saveHistory();
    } catch (e) {
      addMessage('حصل خطأ مؤقت. حاول مرة أخرى بعد لحظات.', 'bot', false);
    } finally {
      setLoading(false);
      isSending = false;
      input.focus();
    }

    return false;
  }

  sendBtn.addEventListener('click', askGroq, true);
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter') askGroq(event); }, true);
})();
