(function () {
  const input = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('aiSendBtn');
  const messages = document.getElementById('aiChatMessages');
  const typing = document.getElementById('aiTypingIndicator');

  if (!input || !sendBtn || !messages) return;
  if (window.__ALADL_GROQ_ASSISTANT_READY__) return;
  window.__ALADL_GROQ_ASSISTANT_READY__ = true;

  const STORAGE_KEY = 'alAdlGroqAssistantHistoryV1';
  let history = [];

  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) history = saved.slice(-8);
  } catch (e) {}

  function saveHistory() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-8))); } catch (e) {}
  }

  function addMessage(text, sender) {
    const div = document.createElement('div');
    div.className = 'ai-message ' + (sender === 'user' ? 'user' : 'bot');
    div.textContent = text;
    messages.insertBefore(div, typing || null);
    messages.scrollTop = messages.scrollHeight;
  }

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
    addMessage(text, 'user');
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
      const reply = data.reply || data.fallback || 'حصل ضغط مؤقت. ابعت لنا طلبك على واتساب 01094799247 وهنرد عليك فورًا.';
      addMessage(reply, 'bot');
      history.push({ role: 'assistant', content: reply });
      history = history.slice(-8);
      saveHistory();
    } catch (e) {
      addMessage('حصل خطأ مؤقت. تقدر تتواصل معنا مباشرة على واتساب 01094799247.', 'bot');
    } finally {
      setLoading(false);
      input.focus();
    }

    return false;
  }

  sendBtn.addEventListener('click', askGroq, true);

  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') askGroq(event);
  }, true);

  input.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') askGroq(event);
  }, true);
})();
