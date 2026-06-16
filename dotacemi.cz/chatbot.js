/* ÚSPORAMI AI CHATBOT — Herbert · Dotacemi.cz */
(function(){
  const API_URL = 'https://api.usporami.cz/api/chat';
  const SESSION_ID = 'ses_' + Math.random().toString(36).substr(2, 12);
  const SITE = 'dotacemi';

  const style = document.createElement('style');
  style.textContent = `
    .chatbot-bubble{position:fixed;bottom:24px;right:24px;z-index:9999;width:64px;height:64px;border-radius:50%;background:#E84393;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:transform .2s,box-shadow .2s;border:none;font-size:28px}
    .chatbot-bubble:hover{transform:scale(1.08);box-shadow:0 12px 32px rgba(0,0,0,.25)}
    .chatbot-bubble.open{transform:scale(0);pointer-events:none}
    .chatbot-bubble.pulse{animation:bubblePulse 2s ease-in-out infinite}
    .chatbot-badge{position:absolute;top:-2px;right:-2px;width:20px;height:20px;border-radius:50%;background:#ff3b30;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;animation:badgePop .3s ease}
    @keyframes bubblePulse{0%,100%{box-shadow:0 8px 24px rgba(0,0,0,.2)}50%{box-shadow:0 8px 24px rgba(0,0,0,.2),0 0 0 12px rgba(134,197,64,.15)}}
    @keyframes badgePop{from{transform:scale(0)}to{transform:scale(1)}}
    .chatbot-tooltip{position:fixed;bottom:96px;right:24px;z-index:9999;background:#fff;color:#1a1a2e;padding:14px 20px;border-radius:16px 16px 4px 16px;box-shadow:0 8px 30px rgba(0,0,0,.15);font-size:14px;font-weight:600;max-width:260px;animation:tooltipIn .4s ease;cursor:pointer}
    .chatbot-tooltip:hover{background:#f9f9f9}
    .chatbot-tooltip .close-tip{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#ddd;color:#666;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none}
    @keyframes tooltipIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .chatbot-panel{position:fixed;bottom:24px;right:24px;z-index:9998;width:420px;max-width:calc(100vw - 32px);height:620px;max-height:calc(100vh - 48px);background:#fff;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden;transform:scale(0);transform-origin:bottom right;transition:transform .3s cubic-bezier(.4,0,.2,1);opacity:0}
    .chatbot-panel.open{transform:scale(1);opacity:1}
    .chatbot-header{padding:20px;background:#1A1A2E;color:#fff;display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}
    .chatbot-header-info{display:flex;align-items:center;gap:12px}
    .chatbot-avatar{width:40px;height:40px;border-radius:50%;background:#E84393;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex:0 0 auto;color:#fff;font-family:system-ui}
    .chatbot-header h4{font-size:16px;font-weight:700;margin:0}.chatbot-header p{font-size:12px;color:rgba(255,255,255,.7);margin:2px 0 0}
    .chatbot-close{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;font-size:18px;transition:background .2s}.chatbot-close:hover{background:rgba(255,255,255,.2)}
    .chatbot-messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
    .chatbot-msg{max-width:88%;padding:14px 18px;border-radius:18px;font-size:14px;line-height:1.55;animation:chatFade .3s ease}
    .chatbot-msg.bot{background:#f4f4f4;color:#1a1a2e;align-self:flex-start;border-bottom-left-radius:6px}
    .chatbot-msg.user{background:#E84393;color:#fff;align-self:flex-end;border-bottom-right-radius:6px}
    .chatbot-msg strong{font-weight:700}
    .chatbot-quick{display:flex;flex-wrap:wrap;gap:8px;padding:0 20px 12px}
    .chatbot-quick button{padding:10px 16px;border:1.5px solid #e0e0e0;border-radius:99px;background:#fff;color:#1a1a2e;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}.chatbot-quick button:hover{border-color:#E84393;background:#FCE4EC}
    .chatbot-input-area{padding:12px 16px;border-top:1px solid #eee;display:flex;gap:8px;align-items:center;flex:0 0 auto}
    .chatbot-input-area input{flex:1;padding:12px 16px;border:1.5px solid #e0e0e0;border-radius:99px;font-size:14px;outline:none;font-family:inherit}.chatbot-input-area input:focus{border-color:#E84393}
    .chatbot-input-area button{width:40px;height:40px;border-radius:50%;background:#E84393;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex:0 0 auto}
    .chatbot-input-area button:disabled{opacity:.4}
    @keyframes chatFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dotPulse{0%,80%,100%{opacity:.3}40%{opacity:1}}
    .typing-dots span{animation:dotPulse 1.4s infinite;animation-fill-mode:both;font-size:20px;letter-spacing:3px}
    .typing-dots span:nth-child(2){animation-delay:.2s}
    .typing-dots span:nth-child(3){animation-delay:.4s}
    @media(max-width:480px){.chatbot-panel{bottom:0;right:0;width:100%;max-width:100%;height:100vh;max-height:100vh;border-radius:0}}
  `;
  document.head.appendChild(style);

  const bubble = document.createElement('button');
  bubble.className = 'chatbot-bubble';
  bubble.innerHTML = '💬';
  bubble.title = 'Zeptejte se Herberta';
  document.body.appendChild(bubble);

  const panel = document.createElement('div');
  panel.className = 'chatbot-panel';
  panel.innerHTML = `
    <div class="chatbot-header">
      <div class="chatbot-header-info"><div class="chatbot-avatar">H</div><div><h4>Herbert</h4><p>Dotační poradce</p></div></div>
      <button class="chatbot-close">✕</button>
    </div>
    <div class="chatbot-messages" id="chatMsgs"></div>
    <div class="chatbot-quick" id="chatQuick"></div>
    <div class="chatbot-input-area"><input type="text" placeholder="Napište dotaz..." id="chatField"><button id="chatSend">→</button></div>
  `;
  document.body.appendChild(panel);

  const msgs = panel.querySelector('#chatMsgs');
  const quick = panel.querySelector('#chatQuick');
  const inputField = panel.querySelector('#chatField');
  const sendBtn = panel.querySelector('#chatSend');
  let sending = false;

  function addMsg(text, type='bot') {
    const d = document.createElement('div');
    d.className = 'chatbot-msg ' + type;
    d.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\\n/g, '<br>').replace(/\n/g, '<br>').replace(/\s*•\s*/g, '<br>• ');
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    const d = document.createElement('div');
    d.className = 'chatbot-msg bot';
    d.innerHTML = '<span class="typing-dots"><span>•</span><span>•</span><span>•</span></span>';
    d.id = 'typingIndicator';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function hideTyping() { const el = document.getElementById('typingIndicator'); if (el) el.remove(); }

  function setQuick(buttons) {
    quick.innerHTML = '';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b;
      btn.addEventListener('click', () => sendMessage(b));
      quick.appendChild(btn);
    });
  }

  async function sendMessage(text) {
    if (sending || !text.trim()) return;
    sending = true; sendBtn.disabled = true;
    addMsg(text, 'user');
    inputField.value = '';
    quick.innerHTML = '';
    showTyping();
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '[Stránka: ' + SITE + '] ' + text, sessionId: SESSION_ID })
      });
      const data = await res.json();
      hideTyping();
      addMsg(data.reply || 'Omlouvám se, zkuste to znovu.');
    } catch (err) {
      hideTyping();
      addMsg('Omlouvám se, nepodařilo se spojit se serverem. Zavolejte na **+420 777 222 199**.');
    }
    sending = false; sendBtn.disabled = false; inputField.focus();
  }

  sendBtn.addEventListener('click', () => sendMessage(inputField.value));
  inputField.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(inputField.value); });

  let opened = false;
  bubble.addEventListener('click', () => {
    bubble.classList.add('open');
    panel.classList.add('open');
    bubble.classList.remove('pulse');
    const existingBadge = bubble.querySelector('.chatbot-badge');
    if (existingBadge) existingBadge.remove();
    const existingTooltip = document.querySelector('.chatbot-tooltip');
    if (existingTooltip) existingTooltip.remove();
    if (!opened) {
      opened = true;
      setTimeout(() => {
        addMsg('Ahoj! 👋 Jsem Herbert, váš dotační poradce. Pomohu vám zorientovat se v programu **Nová zelená úsporám 2026+** a dalších dotacích.\n\nCo řešíte?');
        setTimeout(() => setQuick(['💰 Bezúročný úvěr NZÚ', '🏠 NZÚ Light (dotace)', '✅ Ukončení dotace', '❓ Jsem ohrožená domácnost?']), 400);
      }, 300);
    }
    inputField.focus();
  });

  // Auto-engage after 8 seconds
  setTimeout(() => {
    bubble.classList.remove('pulse');
    const existingBadge = bubble.querySelector('.chatbot-badge');
    if (existingBadge) existingBadge.remove();
    const existingTooltip = document.querySelector('.chatbot-tooltip');
    if (existingTooltip) existingTooltip.remove();
    if (!opened) {
      bubble.classList.add('pulse');
      const badge = document.createElement('span');
      badge.className = 'chatbot-badge';
      badge.textContent = '1';
      bubble.appendChild(badge);
      
      const tooltip = document.createElement('div');
      tooltip.className = 'chatbot-tooltip';
      tooltip.innerHTML = '👋 Potřebujete poradit? Jsem tu pro vás.<span class="close-tip" onclick="event.stopPropagation();this.parentElement.remove()">✕</span>';
      tooltip.addEventListener('click', () => { tooltip.remove(); bubble.click(); });
      document.body.appendChild(tooltip);
      
      setTimeout(() => { if (tooltip.parentElement) tooltip.remove(); }, 15000);
    }
  }, 8000);

  panel.querySelector('.chatbot-close').addEventListener('click', () => {
    panel.classList.remove('open');
    bubble.classList.remove('open');
  });
})();
