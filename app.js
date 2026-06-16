/* =============================================
   Hidayathul Islam Madrasa Committee
   app.js — Supabase Edition (ES Module)
   ============================================= */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qjwklmkxbezdatgtywwj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd2tsbWt4YmV6ZGF0Z3R5d3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDE1ODQsImV4cCI6MjA5NzAxNzU4NH0.X-O6lbVQSKPAEXyCXwM3FcsCBMFHWnaP519CKhHOlas';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ──────────────────────────────
   HELPERS
────────────────────────────── */

function getInitials(name) {
  return (name || '').trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatMonth(m) {
  if (!m) return '—';
  const [year, mo] = String(m).slice(0, 7).split('-');
  const names = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
  return (names[parseInt(mo) - 1] || '') + ' ' + year;
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ──────────────────────────────
   SUPABASE — donors table
────────────────────────────── */

async function loadDonors() {
  const { data, error } = await sb
    .from('donors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { showToast('⚠ Failed to load donors'); console.error(error); return []; }
  return data || [];
}

/* ──────────────────────────────
   MONTH FILTER
────────────────────────────── */

function updateMonthFilter(donors, currentValue) {
  const sel = document.getElementById('filter-month');
  if (!sel) return;
  const months = [...new Set(donors.map(d => d.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="all">All Months</option>';
  months.forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = formatMonth(m);
    sel.appendChild(o);
  });
  if (currentValue && months.includes(currentValue)) sel.value = currentValue;
}

/* ──────────────────────────────
   DONOR CARD
   isDashboard: true  → show Remove Donor in menu
   isDashboard: false → View Details only
   Undo button NEVER shown on cards — only in View Details modal
────────────────────────────── */

function buildDonorCard(d, idx, isDashboard = false) {
  const month = d.date?.slice(0, 7) || '';

  const badgeHtml = d.paid
    ? `<span class="badge badge-paid"><i class="ti ti-check" style="font-size:10px;"></i> Paid</span>`
    : `<span class="badge badge-pending"><i class="ti ti-clock" style="font-size:10px;"></i> Pending</span>`;

  // Only show mark-paid tick for unpaid donors; paid donors get no action button on cards
  const actionBtn = d.paid
    ? ''
    : `<button class="tick-btn" onclick="openMarkPaidModal(event,${d.id})" title="Mark as paid">
         <i class="ti ti-check"></i>
       </button>`;

  const amountHtml = d.amount
    ? `<div class="donor-amount">₹${parseFloat(d.amount).toLocaleString('en-IN')}</div>`
    : `<div class="donor-amount" style="color:rgba(0,0,0,0.15);font-size:13px;">—</div>`;

  const menuItems = isDashboard
    ? `<button class="menu-item" onclick="openDonorDetail(${d.id})">
         <i class="ti ti-eye"></i> View Details
       </button>
       <button class="menu-item danger" onclick="confirmDeleteDonor(event,${d.id})">
         <i class="ti ti-trash"></i> Remove Donor
       </button>`
    : `<button class="menu-item" onclick="openDonorDetail(${d.id})">
         <i class="ti ti-eye"></i> View Details
       </button>`;

  return `
    ${idx > 0 ? '<div class="divider"></div>' : ''}
    <div class="donor-card glass" id="card-${d.id}" onclick="handleCardClick(event,${d.id})">

      <div class="three-dot-wrap" onclick="event.stopPropagation()">
        <button class="three-dot-btn" onclick="toggleMenu(event,${d.id})" title="Options">&#8942;</button>
        <div class="three-dot-menu" id="dotmenu-${d.id}">
          ${menuItems}
        </div>
      </div>

      <div class="avatar">${getInitials(d.name)}</div>

      <div class="donor-info">
        <div class="donor-name">${escHtml(d.name)}</div>
        <div class="donor-ph">
          <i class="ti ti-phone" style="font-size:11px;"></i>${escHtml(d.phone_number)}
        </div>
        ${month ? `<div class="donor-meta">
          <i class="ti ti-calendar" style="font-size:11px;"></i>${formatMonth(month)}
        </div>` : ''}
        ${badgeHtml}
      </div>

      ${amountHtml}

      <div class="donor-actions" onclick="event.stopPropagation()">
        ${actionBtn}
      </div>
    </div>`;
}

/* ──────────────────────────────
   3-DOT MENU
────────────────────────────── */

function toggleMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById(`dotmenu-${id}`);
  const isOpen = menu?.classList.contains('open');
  closeAllMenus();
  if (menu && !isOpen) menu.classList.add('open');
}

function closeAllMenus() {
  document.querySelectorAll('.three-dot-menu').forEach(m => m.classList.remove('open'));
}

document.addEventListener('click', closeAllMenus);

/* ──────────────────────────────
   CARD CLICK → DONOR DETAIL POPUP
────────────────────────────── */

function handleCardClick(e, id) {
  if (e.target.closest('.three-dot-wrap') || e.target.closest('.donor-actions')) return;
  openDonorDetail(id);
}

async function openDonorDetail(id) {
  closeAllMenus();
  const overlay = document.getElementById('donor-modal-overlay');
  const content = document.getElementById('donor-modal-content');
  if (!overlay || !content) return;

  content.innerHTML = `<div class="empty" style="border:none;padding:24px 0;">
    <i class="ti ti-loader-2 spin"></i></div>`;
  overlay.classList.add('open');

  const { data: d, error } = await sb.from('donors').select('*').eq('id', id).single();
  if (error || !d) { content.innerHTML = `<p style="color:#c0392b;text-align:center;">Failed to load.</p>`; return; }

  const statusColor = d.paid ? '#2d7a4f' : '#c97d00';
  const statusText  = d.paid ? '✓ Paid' : '⏳ Pending';
  const today       = new Date().toISOString().slice(0, 10);

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
      <div class="modal-avatar">${getInitials(d.name)}</div>
      <div>
        <div class="modal-name">${escHtml(d.name)}</div>
        <div class="modal-sub">
          <i class="ti ti-phone" style="font-size:12px;"></i>${escHtml(d.phone_number)}
          &nbsp;·&nbsp;
          <span style="color:${statusColor};font-weight:500;">${statusText}</span>
        </div>
      </div>
    </div>

    <div class="modal-info-grid">
      <div class="modal-info-cell">
        <div class="modal-cell-label">Amount</div>
        <div class="modal-cell-value green">${d.amount ? '₹' + parseFloat(d.amount).toLocaleString('en-IN') : '—'}</div>
      </div>
      <div class="modal-info-cell">
        <div class="modal-cell-label">Month</div>
        <div class="modal-cell-value">${d.date ? formatMonth(d.date.slice(0,7)) : '—'}</div>
      </div>
      <div class="modal-info-cell">
        <div class="modal-cell-label">Paid Date</div>
        <div class="modal-cell-value small">${formatDate(d.date)}</div>
      </div>
      <div class="modal-info-cell">
        <div class="modal-cell-label">Status</div>
        <div class="modal-cell-value" style="color:${statusColor};">${statusText}</div>
      </div>
    </div>

    ${!d.paid ? `
      <div class="modal-section-title">Record Payment</div>
      <div class="pay-form">
        <input type="number" id="modal-amount" placeholder="Amount (₹)" min="1" />
        <input type="date"   id="modal-date"   value="${today}" />
        <button class="btn-confirm-pay" onclick="savePaymentFromModal(${d.id})">
          <i class="ti ti-check"></i> Confirm Payment
        </button>
      </div>
    ` : `
      <div class="modal-section-title">Edit Payment</div>
      <div class="pay-form">
        <input type="number" id="modal-amount" placeholder="Amount (₹)" min="1"
               value="${d.amount ? parseFloat(d.amount) : ''}" />
        <input type="date" id="modal-date" value="${d.date ? d.date.slice(0,10) : today}" />
        <button class="btn-confirm-pay" onclick="savePaymentFromModal(${d.id})">
          <i class="ti ti-edit"></i> Update Payment
        </button>
      </div>
      <button class="btn-undo-pay" onclick="openUndoModal(${d.id})">
        <i class="ti ti-arrow-back-up"></i> Undo Payment
      </button>
    `}`;
}

async function savePaymentFromModal(id) {
  const amount = parseFloat(document.getElementById('modal-amount')?.value);
  const date   = document.getElementById('modal-date')?.value;
  if (!amount || amount <= 0) { showToast('⚠ Enter a valid amount'); return; }
  if (!date)                  { showToast('⚠ Select a date'); return; }

  const { error } = await sb.from('donors').update({ paid: true, amount, date }).eq('id', id);
  if (error) { showToast('⚠ Failed: ' + error.message); return; }
  showToast('✓ Payment saved');
  closeDonorModalDirect();
  await refreshAll();
}

function closeDonorModal(e) {
  if (e.target === document.getElementById('donor-modal-overlay')) closeDonorModalDirect();
}

function closeDonorModalDirect() {
  document.getElementById('donor-modal-overlay')?.classList.remove('open');
}

/* ──────────────────────────────
   MARK PAID (tick button on card — Donors page)
────────────────────────────── */

function openMarkPaidModal(e, id) {
  e.stopPropagation();
  const today = new Date().toISOString().slice(0, 10);

  showConfirm({
    emoji: '💚',
    title: 'Record Payment',
    titleColor: '#2d7a4f',
    borderColor: 'rgba(45,122,79,0.35)',
    bodyHtml: `
      <div class="pay-form" style="margin-bottom:0;">
        <input type="number" id="conf-amount" placeholder="Amount (₹)" min="1"
               style="background:var(--surface2);border:1px solid var(--border);
                      border-radius:9px;color:var(--text);padding:10px 13px;font-size:14px;
                      width:100%;outline:none;font-family:inherit;" />
        <input type="date" id="conf-date" value="${today}"
               style="background:var(--surface2);border:1px solid var(--border);
                      border-radius:9px;color:var(--text);padding:10px 13px;font-size:14px;
                      width:100%;outline:none;font-family:inherit;" />
      </div>`,
    confirmLabel: 'Confirm Paid',
    confirmColor: '#2d7a4f',
    onConfirm: async () => {
      const amount = parseFloat(document.getElementById('conf-amount')?.value);
      const date   = document.getElementById('conf-date')?.value;
      if (!amount || amount <= 0) { showToast('⚠ Enter a valid amount'); return false; }
      if (!date)                  { showToast('⚠ Select a date'); return false; }
      const { error } = await sb.from('donors').update({ paid: true, amount, date }).eq('id', id);
      if (error) { showToast('⚠ Failed: ' + error.message); return false; }
      showToast('✓ Payment recorded');
      await refreshAll();
      return true;
    }
  });
}

/* ──────────────────────────────
   UNDO PAYMENT (View Details modal only)
────────────────────────────── */

function openUndoModal(id) {
  closeDonorModalDirect();
  showConfirm({
    emoji: '↩️',
    title: 'Undo Payment?',
    titleColor: '#c0392b',
    bodyHtml: `<p class="confirm-desc">This will mark the donor as <strong>Unpaid</strong> and clear the amount and date.</p>`,
    confirmLabel: 'Yes, Undo',
    confirmColor: '#c0392b',
    onConfirm: async () => {
      const { error } = await sb.from('donors').update({ paid: false, amount: null, date: null }).eq('id', id);
      if (error) { showToast('⚠ Failed to undo'); return false; }
      showToast('Payment set to pending');
      await refreshAll();
      return true;
    }
  });
}

/* ──────────────────────────────
   DELETE DONOR (dashboard only)
────────────────────────────── */

function confirmDeleteDonor(e, id) {
  e && e.stopPropagation();
  closeAllMenus();
  showConfirm({
    emoji: '🗑️',
    title: 'Remove Donor?',
    titleColor: '#c0392b',
    bodyHtml: `<p class="confirm-desc">This action is <strong>permanent</strong> and cannot be undone.</p>`,
    confirmLabel: 'Yes, Delete',
    confirmColor: '#c0392b',
    onConfirm: async () => {
      const { error } = await sb.from('donors').delete().eq('id', id);
      if (error) { showToast('⚠ Failed to delete'); return false; }
      showToast('Donor removed');
      closeDonorModalDirect();
      await refreshAll();
      return true;
    }
  });
}

/* ──────────────────────────────
   REUSABLE CONFIRM DIALOG
────────────────────────────── */

function showConfirm({ emoji, title, titleColor, borderColor, bodyHtml, confirmLabel, confirmColor, onConfirm }) {
  let overlay = document.getElementById('_confirm_overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '_confirm_overlay';
    overlay.className = 'confirm-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="confirm-box" style="${borderColor ? 'border-color:' + borderColor + ';' : ''}">
      <div class="confirm-emoji">${emoji || '⚠️'}</div>
      <div class="confirm-title" style="color:${titleColor || '#c0392b'};">${title}</div>
      ${bodyHtml || ''}
      <div class="confirm-btns" style="margin-top:20px;">
        <button class="btn-cancel-c" id="_conf_cancel">Cancel</button>
        <button class="btn-danger-c" id="_conf_ok" style="background:${confirmColor || '#c0392b'};">${confirmLabel || 'Confirm'}</button>
      </div>
    </div>`;

  overlay.classList.add('open');
  overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('open'); };

  document.getElementById('_conf_cancel').onclick = () => overlay.classList.remove('open');
  document.getElementById('_conf_ok').onclick = async () => {
    const ok = await onConfirm();
    if (ok !== false) overlay.classList.remove('open');
  };
}

/* ──────────────────────────────
   RENDER LIST (index.html)
────────────────────────────── */

async function renderList() {
  const donors = await loadDonors();
  const filter = document.getElementById('filter-month')?.value || 'all';
  const search = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const status = document.getElementById('filter-status')?.value || 'all';

  updateMonthFilter(donors, filter);

  const paidCount    = donors.filter(d => d.paid).length;
  const pendingCount = donors.filter(d => !d.paid).length;
  document.querySelectorAll('.status-tab').forEach(t => {
    const val = t.dataset.status;
    if (!val) return;
    const cnt = val === 'all' ? donors.length : val === 'paid' ? paidCount : pendingCount;
    const label = val === 'all' ? 'All' : val === 'paid'
      ? '<i class="ti ti-circle-check" style="font-size:12px;"></i> Paid'
      : '<i class="ti ti-clock" style="font-size:12px;"></i> Pending';
    t.innerHTML = `${label} <span class="tab-count">${cnt}</span>`;
  });

  let list = filter === 'all' ? donors : donors.filter(d => d.date?.startsWith(filter));
  if (status === 'paid')    list = list.filter(d => d.paid);
  if (status === 'pending') list = list.filter(d => !d.paid);
  if (search) list = list.filter(d =>
    d.name.toLowerCase().includes(search) ||
    (d.phone_number || '').toLowerCase().includes(search)
  );

  const el = document.getElementById('donor-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="empty glass">
      <i class="ti ti-${search ? 'search-off' : 'users-group'}"></i>
      ${search
        ? `No donor found for "<strong>${escHtml(search)}</strong>"`
        : status !== 'all'
          ? `No ${status} donors found`
          : 'No donors yet. <a href="add-donor.html" style="color:var(--green);">Add one →</a>'}
    </div>`;
    return;
  }

  el.innerHTML = list.map((d, i) => buildDonorCard(d, i, false)).join('');
}

/* ──────────────────────────────
   RECENT (add-donor.html)
────────────────────────────── */

async function renderRecent() {
  const el = document.getElementById('recent-list');
  if (!el) return;
  const donors = await loadDonors();
  const recent = donors.slice(0, 6);
  if (!recent.length) {
    el.innerHTML = `<div class="empty glass"><i class="ti ti-inbox"></i>No donors yet</div>`;
    return;
  }
  el.innerHTML = `<div class="donor-list">${recent.map((d, i) => buildDonorCard(d, i, false)).join('')}</div>`;
}

/* ──────────────────────────────
   ADD DONOR
────────────────────────────── */

async function addDonor() {
  const name  = document.getElementById('inp-name')?.value.trim();
  const phone = document.getElementById('inp-phone')?.value.trim();

  if (!name)  { showToast('⚠ Please enter a name'); return; }
  if (!phone) { showToast('⚠ Please enter a phone number'); return; }
  if (!/^\d{10}$/.test(phone))   { showToast('⚠ Phone must be exactly 10 digits'); return; }
  if (/^(\d)\1{9}$/.test(phone)) { showToast('⚠ Enter a valid phone number'); return; }

  // Check for duplicate phone number
  const { data: existing } = await sb.from('donors').select('id, name').eq('phone_number', phone).maybeSingle();
  if (existing) {
    const phoneEl = document.getElementById('inp-phone');
    if (phoneEl) {
      phoneEl.style.borderColor = 'var(--red)';
      phoneEl.style.boxShadow   = '0 0 0 3px var(--red-dim)';
      setTimeout(() => { phoneEl.style.borderColor = ''; phoneEl.style.boxShadow = ''; }, 3000);
    }
    showToast(`\u26a0 ${phone} is already registered under "${existing.name}"`);
    return;
  }

  const btn = document.querySelector('.btn-add');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 spin"></i> Saving…'; }

  const { error } = await sb.from('donors').insert([{ name, phone_number: phone, paid: false }]);

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-user-plus"></i> Add Donor'; }

  if (error) { showToast('⚠ Failed: ' + error.message); return; }

  document.getElementById('inp-name').value  = '';
  document.getElementById('inp-phone').value = '';

  showToast('✓ Donor added successfully');
  await renderRecent();
}

/* ──────────────────────────────
   DASHBOARD
────────────────────────────── */

async function renderDashboard() {
  const donors = await loadDonors();
  const filter = document.getElementById('filter-month')?.value || 'all';
  updateMonthFilter(donors, filter);

  const list      = filter === 'all' ? donors : donors.filter(d => d.date?.startsWith(filter));
  const paid      = list.filter(d => d.paid);
  const unpaid    = list.filter(d => !d.paid);
  const totalPaid = paid.reduce((s, d) => s + parseFloat(d.amount || 0), 0);

  const statsEl = document.getElementById('stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card glass">
        <span class="stat-icon" style="color:var(--green);"><i class="ti ti-currency-rupee"></i></span>
        <div class="stat-label">${filter === 'all' ? 'Total Collected' : formatMonth(filter) + ' Collected'}</div>
        <div class="stat-value green">₹${totalPaid.toLocaleString('en-IN')}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:var(--amber);"><i class="ti ti-clock-pause"></i></span>
        <div class="stat-label">Pending Donors</div>
        <div class="stat-value amber">${unpaid.length}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:var(--blue);"><i class="ti ti-users"></i></span>
        <div class="stat-label">Total Donors</div>
        <div class="stat-value blue">${list.length}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#7c3aed;"><i class="ti ti-circle-check"></i></span>
        <div class="stat-label">Paid Donors</div>
        <div class="stat-value purple">${paid.length}</div>
      </div>`;
  }

  const breakdownSection = document.getElementById('breakdown-section');
  const donorSection     = document.getElementById('donor-section');

  if (filter === 'all') {
    if (breakdownSection) breakdownSection.style.display = '';
    if (donorSection)     donorSection.style.display = 'none';

    const monthlyEl = document.getElementById('monthly-grid');
    if (monthlyEl) {
      const allMonths = [...new Set(donors.map(d => d.date?.slice(0,7)).filter(Boolean))].sort().reverse();
      const monthData = allMonths.map(m => {
        const mDonors   = donors.filter(d => d.date?.startsWith(m));
        const mPaid     = mDonors.filter(d => d.paid).reduce((s,d) => s + parseFloat(d.amount || 0), 0);
        const paidCount = mDonors.filter(d => d.paid).length;
        return { m, mDonors, mPaid, paidCount };
      });
      const maxAmt = Math.max(...monthData.map(d => d.mPaid), 1);

      monthlyEl.innerHTML = !monthData.length
        ? `<div class="empty glass"><i class="ti ti-calendar-off"></i>No payment data yet</div>`
        : monthData.map(({ m, mDonors, mPaid, paidCount }) => `
            <div class="month-row glass">
              <div class="month-name">${formatMonth(m)}</div>
              <div class="month-bar-wrap">
                <div class="month-bar" style="width:${Math.round((mPaid/maxAmt)*100)}%;"></div>
              </div>
              <div class="month-amount">₹${mPaid.toLocaleString('en-IN')}</div>
              <div class="month-count">${paidCount} paid / ${mDonors.length} total</div>
            </div>`).join('');
    }

  } else {
    if (breakdownSection) breakdownSection.style.display = 'none';
    if (donorSection)     donorSection.style.display = '';

    const titleEl = document.getElementById('donor-section-title');
    if (titleEl) titleEl.textContent = `Donors — ${formatMonth(filter)}`;

    const listEl = document.getElementById('dashboard-donor-list');
    if (listEl) {
      listEl.innerHTML = !list.length
        ? `<div class="empty glass"><i class="ti ti-users-group"></i>No donors for this month</div>`
        : list.map((d, i) => buildDonorCard(d, i, true)).join('');
    }
  }
}

/* ──────────────────────────────
   REFRESH HELPER
────────────────────────────── */

async function refreshAll() {
  if (document.getElementById('donor-list'))  await renderList();
  if (document.getElementById('recent-list')) await renderRecent();
  if (document.getElementById('stats'))       await renderDashboard();
}

/* ──────────────────────────────
   EXPOSE GLOBALS
────────────────────────────── */

window.renderList            = renderList;
window.renderRecent          = renderRecent;
window.renderDashboard       = renderDashboard;
window.addDonor              = addDonor;
window.handleCardClick       = handleCardClick;
window.openDonorDetail       = openDonorDetail;
window.closeDonorModal       = closeDonorModal;
window.closeDonorModalDirect = closeDonorModalDirect;
window.savePaymentFromModal  = savePaymentFromModal;
window.openMarkPaidModal     = openMarkPaidModal;
window.openUndoModal         = openUndoModal;
window.confirmDeleteDonor    = confirmDeleteDonor;
window.toggleMenu            = toggleMenu;

/* ──────────────────────────────
   INIT
────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('search-input')?.addEventListener('input', () => renderList());
  await refreshAll();
});