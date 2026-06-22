/* =============================================
   PIN Lock — 4-digit passcode gate
   ============================================= */

(function () {
  const CORRECT_PIN = '6777';
  const SESSION_KEY = 'madrasa_unlocked';

  // Already unlocked this session
  if (sessionStorage.getItem(SESSION_KEY) === '1') return;

  // Build lock screen
  const overlay = document.createElement('div');
  overlay.id = 'pin-overlay';
  overlay.innerHTML = `
    <div class="pin-box">
      <div class="pin-icon"><i class="ti ti-building-mosque"></i></div>
      <div class="pin-title">Hidayathul Islam<br>Madrasa Committee</div>
      <div class="pin-subtitle">Enter PIN to continue</div>
      <div class="pin-dots">
        <span class="pin-dot" id="pd0"></span>
        <span class="pin-dot" id="pd1"></span>
        <span class="pin-dot" id="pd2"></span>
        <span class="pin-dot" id="pd3"></span>
      </div>
      <div class="pin-error" id="pin-error"></div>
      <div class="pin-grid">
        ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k => `
          <button class="pin-key${k === '' ? ' pin-key-empty' : ''}" data-key="${k}">${k}</button>
        `).join('')}
      </div>
    </div>`;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #pin-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: #fdf8f0;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    .pin-box {
      text-align: center;
      padding: 40px 32px;
      background: #fff;
      border: 1px solid rgba(180,130,60,0.18);
      border-radius: 20px;
      box-shadow: 0 8px 40px rgba(120,80,20,0.13);
      width: 100%;
      max-width: 320px;
    }
    .pin-icon {
      font-size: 38px;
      color: #d4a017;
      margin-bottom: 10px;
    }
    .pin-title {
      font-size: 16px;
      font-weight: 700;
      color: #6b3a1f;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .pin-subtitle {
      font-size: 12px;
      color: #a07850;
      margin-bottom: 24px;
    }
    .pin-dots {
      display: flex;
      justify-content: center;
      gap: 14px;
      margin-bottom: 8px;
    }
    .pin-dot {
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 2px solid rgba(180,130,60,0.35);
      background: transparent;
      transition: background 0.15s, border-color 0.15s;
      display: inline-block;
    }
    .pin-dot.filled {
      background: #d4a017;
      border-color: #d4a017;
    }
    .pin-dot.error {
      background: #c0392b;
      border-color: #c0392b;
    }
    .pin-error {
      font-size: 12px;
      color: #c0392b;
      min-height: 18px;
      margin-bottom: 16px;
      font-weight: 500;
    }
    .pin-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .pin-key {
      padding: 16px;
      font-size: 18px;
      font-weight: 600;
      color: #2c1a0e;
      background: #fdf3e0;
      border: 1px solid rgba(180,130,60,0.18);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
      font-family: inherit;
    }
    .pin-key:hover { background: rgba(212,160,23,0.15); }
    .pin-key:active { transform: scale(0.93); }
    .pin-key-empty { background: transparent; border-color: transparent; cursor: default; pointer-events: none; }
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%,60% { transform: translateX(-8px); }
      40%,80% { transform: translateX(8px); }
    }
    .pin-shake { animation: shake 0.35s ease; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  let entered = '';

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`pd${i}`);
      dot.className = 'pin-dot' + (i < entered.length ? ' filled' : '');
    }
  }

  function showError(msg) {
    const err = document.getElementById('pin-error');
    err.textContent = msg;
    for (let i = 0; i < 4; i++) {
      document.getElementById(`pd${i}`).className = 'pin-dot error';
    }
    const box = overlay.querySelector('.pin-box');
    box.classList.add('pin-shake');
    setTimeout(() => {
      box.classList.remove('pin-shake');
      entered = '';
      updateDots();
      setTimeout(() => { err.textContent = ''; }, 800);
    }, 400);
  }

  function handleKey(key) {
    if (key === '⌫') {
      entered = entered.slice(0, -1);
      document.getElementById('pin-error').textContent = '';
      updateDots();
      return;
    }
    if (entered.length >= 4) return;
    entered += key;
    updateDots();

    if (entered.length === 4) {
      if (entered === CORRECT_PIN) {
        sessionStorage.setItem(SESSION_KEY, '1');
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s';
        setTimeout(() => overlay.remove(), 250);
      } else {
        showError('Incorrect PIN. Try again.');
      }
    }
  }

  overlay.addEventListener('click', e => {
    const key = e.target.dataset.key;
    if (key !== undefined && key !== '') handleKey(key);
  });

  // Keyboard support
  document.addEventListener('keydown', function handler(e) {
    if (!document.getElementById('pin-overlay')) {
      document.removeEventListener('keydown', handler);
      return;
    }
    if (e.key >= '0' && e.key <= '9') handleKey(e.key);
    if (e.key === 'Backspace') handleKey('⌫');
  });
})();