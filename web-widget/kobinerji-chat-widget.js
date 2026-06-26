/*
 * KOBİNERJİ Web Karşılama Botu — gömülebilir widget (bağımsız, çerçevesiz vanilla JS).
 * Müşterinin web sitesine TEK script ile eklenir; public-chat edge fonksiyonuna konuşur.
 * İç CRM/PII'ye erişmez; yalnız kamuya açık bilgi + talep toplama.
 *
 * Kurulum (sitenin <body> sonuna):
 *   <script src="https://CDN/kobinerji-chat-widget.js"
 *           data-supabase-url="https://mdwcasycfssdkogdlbyh.supabase.co"
 *           data-anon-key="sb_publishable_..."
 *           data-turnstile-sitekey="0x..."   (opsiyonel; captcha için)
 *           data-title="KOBİNERJİ Asistan"
 *           data-accent="#06b6d4" defer></script>
 *
 * data-anon-key publishable key'tir (uygulama bundle'ında zaten herkese açık; RLS korur).
 */
(function () {
  'use strict';
  var s = document.currentScript || (function () { var a = document.getElementsByTagName('script'); return a[a.length - 1]; })();
  var CFG = {
    url: (s.getAttribute('data-supabase-url') || '').replace(/\/$/, ''),
    anon: s.getAttribute('data-anon-key') || '',
    turnstile: s.getAttribute('data-turnstile-sitekey') || '',
    title: s.getAttribute('data-title') || 'Asistan',
    accent: s.getAttribute('data-accent') || '#06b6d4',
  };
  if (!CFG.url || !CFG.anon) { console.warn('[kobinerji-chat] data-supabase-url ve data-anon-key gerekli.'); return; }
  var FN = CFG.url + '/functions/v1/public-chat';

  var history = [];          // {role, content}
  var captchaToken = '';
  var busy = false;

  // ── stil ──
  var css = '\
  .kbz-btn{position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;background:' + CFG.accent + ';color:#fff;border:none;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:26px;z-index:2147483000;display:flex;align-items:center;justify-content:center}\
  .kbz-panel{position:fixed;right:20px;bottom:90px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#0b1220;color:#e5e7eb;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.4);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}\
  .kbz-panel.kbz-open{display:flex}\
  .kbz-hd{background:' + CFG.accent + ';color:#fff;padding:14px 16px;font-weight:700;display:flex;justify-content:space-between;align-items:center}\
  .kbz-x{cursor:pointer;font-size:20px;line-height:1;opacity:.9;background:none;border:none;color:#fff}\
  .kbz-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}\
  .kbz-b{padding:9px 12px;border-radius:12px;max-width:85%;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}\
  .kbz-u{align-self:flex-end;background:' + CFG.accent + ';color:#fff}\
  .kbz-a{align-self:flex-start;background:#1f2937;color:#e5e7eb}\
  .kbz-src{font-size:11px;opacity:.6;margin-top:2px}\
  .kbz-in{display:flex;gap:8px;padding:10px;border-top:1px solid #1f2937}\
  .kbz-in textarea{flex:1;resize:none;border:1px solid #374151;background:#111827;color:#e5e7eb;border-radius:10px;padding:9px 11px;font-size:14px;font-family:inherit;max-height:90px}\
  .kbz-send{background:' + CFG.accent + ';color:#fff;border:none;border-radius:10px;padding:0 14px;cursor:pointer;font-weight:700}\
  .kbz-send:disabled{opacity:.5;cursor:default}\
  .kbz-lead{font-size:12px;text-align:center;color:#9ca3af;padding:0 12px 8px;cursor:pointer;text-decoration:underline}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ── DOM ──
  var btn = document.createElement('button'); btn.className = 'kbz-btn'; btn.innerHTML = '💬'; btn.setAttribute('aria-label', 'Sohbet');
  var panel = document.createElement('div'); panel.className = 'kbz-panel';
  panel.innerHTML =
    '<div class="kbz-hd"><span>' + esc(CFG.title) + '</span><button class="kbz-x" aria-label="Kapat">×</button></div>' +
    '<div class="kbz-msgs"></div>' +
    '<div class="kbz-lead">📋 Teklif/işlem için talep bırakın</div>' +
    '<div class="kbz-in"><textarea rows="1" placeholder="Mesajınızı yazın..."></textarea><button class="kbz-send">➤</button></div>';
  document.body.appendChild(btn); document.body.appendChild(panel);

  var msgsEl = panel.querySelector('.kbz-msgs');
  var ta = panel.querySelector('textarea');
  var sendBtn = panel.querySelector('.kbz-send');

  btn.onclick = function () {
    panel.classList.toggle('kbz-open');
    if (panel.classList.contains('kbz-open')) {
      if (!history.length) addMsg('a', 'Merhaba! KOBİNERJİ asistanıyım. Size nasıl yardımcı olabilirim? Fiyat/teklif için talebinizi de bırakabilirsiniz.');
      loadTurnstile();
      ta.focus();
    }
  };
  panel.querySelector('.kbz-x').onclick = function () { panel.classList.remove('kbz-open'); };
  panel.querySelector('.kbz-lead').onclick = openLeadForm;
  sendBtn.onclick = send;
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function addMsg(role, text, sources) {
    var d = document.createElement('div'); d.className = 'kbz-b ' + (role === 'u' ? 'kbz-u' : 'kbz-a'); d.textContent = text;
    if (sources && sources.length) { var sd = document.createElement('div'); sd.className = 'kbz-src'; sd.textContent = 'Kaynak: ' + sources.join(', '); d.appendChild(sd); }
    msgsEl.appendChild(d); msgsEl.scrollTop = msgsEl.scrollHeight; return d;
  }

  function loadTurnstile() {
    if (!CFG.turnstile || window.__kbzTs) return;
    window.__kbzTs = true;
    var sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; sc.async = true; document.head.appendChild(sc);
    var holder = document.createElement('div'); holder.style.display = 'none'; document.body.appendChild(holder);
    sc.onload = function () {
      try { window.turnstile.render(holder, { sitekey: CFG.turnstile, callback: function (t) { captchaToken = t; }, 'error-callback': function () { captchaToken = ''; } }); } catch (e) {}
    };
  }

  async function call(payload) {
    var r = await fetch(FN, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: CFG.anon, authorization: 'Bearer ' + CFG.anon },
      body: JSON.stringify(Object.assign({ turnstileToken: captchaToken }, payload)),
    });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j && j.error ? j.error : 'Bağlantı hatası');
    return j;
  }

  async function send() {
    var text = (ta.value || '').trim();
    if (!text || busy) return;
    ta.value = ''; addMsg('u', text); history.push({ role: 'user', content: text });
    busy = true; sendBtn.disabled = true;
    var typing = addMsg('a', '…');
    try {
      var j = await call({ action: 'chat', message: text, history: history.slice(0, -1) });
      typing.textContent = j.answer || '(yanıt yok)';
      if (j.sources && j.sources.length) { var sd = document.createElement('div'); sd.className = 'kbz-src'; sd.textContent = 'Kaynak: ' + j.sources.join(', '); typing.appendChild(sd); }
      history.push({ role: 'assistant', content: j.answer || '' });
    } catch (e) {
      typing.textContent = '⚠ ' + (e.message || 'Bir hata oluştu, lütfen tekrar deneyin.');
    } finally { busy = false; sendBtn.disabled = false; ta.focus(); }
  }

  function openLeadForm() {
    var name = prompt('Adınız Soyadınız:'); if (name === null) return;
    var contact = prompt('Telefon veya e-posta:'); if (contact === null) return;
    var message = prompt('Talebiniz / ihtiyacınız:'); if (message === null || !message.trim()) return;
    busy = true;
    call({ action: 'capture', request: { name: name, contact: contact, message: message } })
      .then(function (j) { addMsg('a', j.message || 'Talebiniz alındı, teşekkürler!'); })
      .catch(function (e) { addMsg('a', '⚠ Talep gönderilemedi: ' + (e.message || '')); })
      .finally(function () { busy = false; });
  }
})();
