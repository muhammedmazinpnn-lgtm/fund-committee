/* =============================================
   Hidayathul Islam Madrasa Committee
   app.js — Supabase Edition
   ============================================= */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qjwklmkxbezdatgtywwj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd2tsbWt4YmV6ZGF0Z3R5d3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDE1ODQsImV4cCI6MjA5NzAxNzU4NH0.X-O6lbVQSKPAEXyCXwM3FcsCBMFHWnaP519CKhHOlas';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const undoConfirmState = {};

/* ---------- HELPERS ---------- */

function getInitials(name) {
  return name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatMonth(m) {
  if (!m) return '';
  const [year, mo] = m.split('-');
  const names = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
  return names[parseInt(mo) - 1] + ' ' + year;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function closeAllMenus() {
  document.querySelectorAll('[id^="menu-"]').forEach(m => m.style.display = 'none');
}

/* ---------- DATA ---------- */

async function loadDonors() {
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { showToast('⚠ Failed to load donors'); return []; }
  return data || [];
}

/* ---------- MONTH FILTER ---------- */

function updateMonthFilter(donors, currentValue) {
  const sel = document.getElementById('filter-month');
  if (!sel) return;
  const months = [...new Set(donors.map(d => d.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="all">All Months</option>';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonth(m);
    sel.appendChild(opt);
  });
  if (currentValue && months.includes(currentValue)) sel.value = currentValue;
}

/* ---------- DONOR CARD ---------- */

function renderDonorCard(d, index) {
  const month = d.date?.slice(0, 7) || '';
  return `
    ${index > 0 ? '<div class="divider"></div>' : ''}
    <div class="donor-card glass" id="card-${d.id}" style="position:relative;cursor:pointer;"
         onclick="handleCardClick(event, ${d.id})">

      <!-- 3-dot menu -->
      <div style="position:absolute;top:10px;right:10px;">
        <button onclick="toggleMenu(event, ${d.id})" title="Options"
          style="background:none;border:none;color:#666;cursor:pointer;
                 font-size:22px;line-height:1;padding:2px 7px;border-radius:6px;">
          &#8942;
        </button>
        <div id="menu-${d.id}"
          style="display:none;position:absolute;right:0;top:30px;
                 background:#1e1e1e;border:1px solid #333;border-radius:8px;
                 min-width:150px;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.6);">
          <button onclick="deleteDonor(event, ${d.id})"
            style="width:100%;padding:11px 14px;background:none;border:none;
                   color:#dc2626;cursor:pointer;text-align:left;font-size:13px;
                   display:flex;align-items:center;gap:8px;border-radius:8px;">
            <i class="ti ti-trash"></i> Remove Donor
          </button>
        </div>
      </div>

      <div class="avatar">${getInitials(d.name)}</div>
      <div class="donor-info">
        <div class="donor-name">${escHtml(d.name)}</div>
        <div class="donor-ph">
          <i class="ti ti-phone" style="font-size:11px;"></i>${escHtml(d.phone_number)}
        </div>
        ${d.date ? `<div class="donor-meta">
          <i class="ti ti-calendar" style="font-size:11px;"></i>${formatMonth(month)}
        </div>` : ''}
        ${d.paid
          ? '<span class="badge badge-paid">&#10003; Paid</span>'
          : '<span class="badge badge-pending">&#9203; Pending</span>'}
      </div>

      <div class="donor-amount">
        ${d.amount ? '&#8377;' + parseFloat(d.amount).toLocaleString('en-IN') : '<span style="color:#555;font-size:13px;">—</span>'}
      </div>

      <div class="donor-actions">
        ${!d.paid
          ? `<button class="tick-btn" onclick="markPaid(event, ${d.id})" title="Mark as paid">
               <i class="ti ti-check"></i>
             </button>`
          : `<button class="del-btn" id="undo-btn-${d.id}" onclick="undoPayment(event, ${d.id})" title="Undo payment">
               <i class="ti ti-x"></i>
             </button>`
        }
      </div>
    </div>`;
}

/* ---------- CARD CLICK → DONOR DETAIL POPUP ---------- */

function handleCardClick(e, id) {
  // Don't open popup if clicking buttons or menu
  if (e.target.closest('button') || e.target.closest('[id^="menu-"]')) return;
  showDonorDetail(id);
}

async function showDonorDetail(id) {
  const { data: d, error } = await supabase.from('donors').select('*').eq('id', id).single();
  if (error || !d) return;

  document.getElementById('confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'confirm-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);
    display:flex;align-items:center;justify-content:center;z-index:9999;`;

  modal.innerHTML = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;
                padding:28px 28px 24px;max-width:360px;width:90%;
                box-shadow:0 0 40px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px;">
        <div style="width:50px;height:50px;border-radius:50%;background:#1a3a1a;
                    display:flex;align-items:center;justify-content:center;
                    font-size:18px;font-weight:700;color:#4ade80;flex-shrink:0;">
          ${getInitials(d.name)}
        </div>
        <div>
          <div style="font-size:17px;font-weight:600;color:#fff;">${escHtml(d.name)}</div>
          <div style="font-size:12px;color:#4ade80;margin-top:2px;">
            ${d.paid ? '✓ Paid' : '⏳ Pending'}
          </div>
        </div>
        <button onclick="document.getElementById('confirm-modal').remove()"
          style="margin-left:auto;background:none;border:none;color:#666;
                 cursor:pointer;font-size:20px;line-height:1;">&#10005;</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:12px 14px;background:#111;border-radius:10px;">
          <span style="color:#888;font-size:13px;display:flex;align-items:center;gap:7px;">
            <i class="ti ti-phone"></i> Phone
          </span>
          <span style="color:#fff;font-size:13px;">${escHtml(d.phone_number)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:12px 14px;background:#111;border-radius:10px;">
          <span style="color:#888;font-size:13px;display:flex;align-items:center;gap:7px;">
            <i class="ti ti-currency-rupee"></i> Amount
          </span>
          <span style="color:#4ade80;font-size:15px;font-weight:600;">
            ${d.amount ? '₹' + parseFloat(d.amount).toLocaleString('en-IN') : '—'}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:12px 14px;background:#111;border-radius:10px;">
          <span style="color:#888;font-size:13px;display:flex;align-items:center;gap:7px;">
            <i class="ti ti-calendar"></i> Paid Date
          </span>
          <span style="color:#fff;font-size:13px;">${formatDate(d.date)}</span>
        </div>
      </div>

      <button onclick="document.getElementById('confirm-modal').remove()"
        style="width:100%;margin-top:20px;padding:11px;border-radius:8px;border:1px solid #333;
               background:#2a2a2a;color:#fff;cursor:pointer;font-size:14px;">
        Close
      </button>
    </div>`;

  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

/* ---------- MARK AS PAID (with amount + date popup) ---------- */

function markPaid(e, id) {
  e.stopPropagation();
  document.getElementById('confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'confirm-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);
    display:flex;align-items:center;justify-content:center;z-index:9999;`;

  const today = new Date().toISOString().split('T')[0];
  modal.innerHTML = `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px;
                padding:26px 28px;max-width:340px;width:90%;
                box-shadow:0 0 40px rgba(0,0,0,0.5);">
      <h3 style="color:#4ade80;font-size:16px;margin:0 0 18px;display:flex;align-items:center;gap:8px;">
        <i class="ti ti-circle-check"></i> Record Payment
      </h3>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
        <div>
          <label style="color:#888;font-size:12px;display:block;margin-bottom:6px;">
            <i class="ti ti-currency-rupee"></i> Amount (₹)
          </label>
          <input id="pay-amount" type="number" min="1" placeholder="e.g. 500"
            style="width:100%;padding:10px 12px;background:#111;border:1px solid #333;
                   border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;" />
        </div>
        <div>
          <label style="color:#888;font-size:12px;display:block;margin-bottom:6px;">
            <i class="ti ti-calendar"></i> Payment Date
          </label>
          <input id="pay-date" type="date" value="${today}"
            style="width:100%;padding:10px 12px;background:#111;border:1px solid #333;
                   border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;" />
        </div>
      </div>
      <div style="display:flex;gap:12px;">
        <button id="modal-cancel"
          style="flex:1;padding:10px;border-radius:8px;border:1px solid #444;
                 background:#2a2a2a;color:#fff;cursor:pointer;font-size:14px;">
          Cancel
        </button>
        <button id="modal-confirm"
          style="flex:1;padding:10px;border-radius:8px;border:none;
                 background:#16a34a;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">
          Confirm Paid
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  document.getElementById('modal-cancel').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  document.getElementById('modal-confirm').onclick = async () => {
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const date   = document.getElementById('pay-date').value;
    if (!amount || amount <= 0) { showToast('⚠ Please enter a valid amount'); return; }
    if (!date)                  { showToast('⚠ Please select a date'); return; }

    const { error } = await supabase.from('donors').update({ paid: true, amount, date }).eq('id', id);
    if (error) { showToast('⚠ Failed to update'); return; }
    modal.remove();
    showToast('✓ Payment recorded');
    await renderList();
    await renderRecent();
  };
}

/* ---------- UNDO PAYMENT (2-step red) ---------- */

function undoPayment(e, id) {
  e.stopPropagation();
  if (!undoConfirmState[id]) {
    undoConfirmState[id] = true;
    const btn = document.getElementById(`undo-btn-${id}`);
    if (btn) {
      btn.innerHTML = '<i class="ti ti-alert-triangle"></i> Undo?';
      btn.style.cssText = 'background:#dc2626;color:#fff;padding:0 10px;border-radius:6px;font-size:12px;width:auto;gap:4px;display:flex;align-items:center;';
    }
    setTimeout(() => {
      delete undoConfirmState[id];
      const b = document.getElementById(`undo-btn-${id}`);
      if (b) { b.innerHTML = '<i class="ti ti-x"></i>'; b.style.cssText = ''; }
    }, 4000);
  } else {
    delete undoConfirmState[id];
    showUndoModal(id);
  }
}

function showUndoModal(id) {
  document.getElementById('confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'confirm-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);
    display:flex;align-items:center;justify-content:center;z-index:9999;`;
  modal.innerHTML = `
    <div style="background:#1a1a1a;border:2px solid #dc2626;border-radius:14px;
                padding:28px 32px;max-width:340px;width:90%;text-align:center;
                box-shadow:0 0 40px rgba(220,38,38,0.4);">
      <div style="font-size:38px;margin-bottom:12px;">↩️</div>
      <h3 style="color:#dc2626;font-size:18px;margin:0 0 8px;">Undo Payment?</h3>
      <p style="color:#aaa;font-size:13px;margin:0 0 24px;">
        This will mark the donor as <strong style="color:#fff;">Unpaid</strong>
        and clear the amount and date.
      </p>
      <div style="display:flex;gap:12px;">
        <button id="modal-cancel"
          style="flex:1;padding:10px;border-radius:8px;border:1px solid #444;
                 background:#2a2a2a;color:#fff;cursor:pointer;font-size:14px;">Cancel</button>
        <button id="modal-confirm"
          style="flex:1;padding:10px;border-radius:8px;border:none;
                 background:#dc2626;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">
          Yes, Undo</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('modal-cancel').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('modal-confirm').onclick = async () => {
    modal.remove();
    const { error } = await supabase.from('donors')
      .update({ paid: false, amount: null, date: null }).eq('id', id);
    if (error) { showToast('⚠ Failed to undo'); return; }
    showToast('Payment marked as pending');
    await renderList();
    await renderRecent();
  };
}

/* ---------- DELETE DONOR (3-dot → red modal) ---------- */

function deleteDonor(e, id) {
  e.stopPropagation();
  closeAllMenus();
  document.getElementById('confirm-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'confirm-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);
    display:flex;align-items:center;justify-content:center;z-index:9999;`;
  modal.innerHTML = `
    <div style="background:#1a1a1a;border:2px solid #dc2626;border-radius:14px;
                padding:28px 32px;max-width:340px;width:90%;text-align:center;
                box-shadow:0 0 40px rgba(220,38,38,0.4);">
      <div style="font-size:38px;margin-bottom:12px;">🗑️</div>
      <h3 style="color:#dc2626;font-size:18px;margin:0 0 8px;">Remove Donor?</h3>
      <p style="color:#aaa;font-size:13px;margin:0 0 24px;">
        This action is <strong style="color:#fff;">permanent</strong> and cannot be undone.
      </p>
      <div style="display:flex;gap:12px;">
        <button id="modal-cancel"
          style="flex:1;padding:10px;border-radius:8px;border:1px solid #444;
                 background:#2a2a2a;color:#fff;cursor:pointer;font-size:14px;">Cancel</button>
        <button id="modal-confirm"
          style="flex:1;padding:10px;border-radius:8px;border:none;
                 background:#dc2626;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">
          Yes, Delete</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById('modal-cancel').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('modal-confirm').onclick = async () => {
    modal.remove();
    const { error } = await supabase.from('donors').delete().eq('id', id);
    if (error) { showToast('⚠ Failed to delete'); return; }
    showToast('Donor removed');
    await renderList();
    await renderRecent();
  };
}

/* ---------- 3-DOT MENU ---------- */

function toggleMenu(e, id) {
  e.stopPropagation();
  const menu = document.getElementById(`menu-${id}`);
  const isOpen = menu?.style.display === 'block';
  closeAllMenus();
  if (menu && !isOpen) menu.style.display = 'block';
}

document.addEventListener('click', () => closeAllMenus());

/* ---------- SEARCH ---------- */

function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => renderList());
}

/* ---------- DONOR LIST (index.html) ---------- */

async function renderList() {
  const donors  = await loadDonors();
  const filter  = document.getElementById('filter-month')?.value || 'all';
  const search  = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  const status  = document.getElementById('filter-status')?.value || 'all';
  updateMonthFilter(donors, filter);

  let list = filter === 'all' ? donors : donors.filter(d => d.date?.startsWith(filter));
  if (status === 'paid')    list = list.filter(d => d.paid);
  if (status === 'pending') list = list.filter(d => !d.paid);
  if (search) {
    list = list.filter(d =>
      d.name.toLowerCase().includes(search) ||
      d.phone_number.toLowerCase().includes(search)
    );
  }

  const el = document.getElementById('donor-list');
  if (!el) return;

  const paidCount    = donors.filter(d => d.paid).length;
  const pendingCount = donors.filter(d => !d.paid).length;
  document.querySelectorAll('.status-tab').forEach(t => {
    const val = t.dataset.status;
    const cnt = val === 'all' ? donors.length : val === 'paid' ? paidCount : pendingCount;
    const label = val === 'all' ? 'All' : val === 'paid' ? '✓ Paid' : '⏳ Pending';
    t.innerHTML = label + ' <span class="tab-count">' + cnt + '</span>';
    t.classList.toggle('tab-active', val === status);
  });

  if (!list.length) {
    el.innerHTML = `<div class="empty glass"><i class="ti ti-database-off"></i>
      ${search ? 'No donor found for "' + escHtml(search) + '"' : 'No donors in this category'}</div>`;
    return;
  }
  el.innerHTML = list.map((d, i) => renderDonorCard(d, i)).join('');
}

/* ---------- ADD DONOR (add-donor.html) — name + phone only ---------- */

async function addDonor() {
  const name  = document.getElementById('inp-name')?.value.trim();
  const phone = document.getElementById('inp-phone')?.value.trim();

  if (!name)  { showToast('⚠ Please enter a name');         return; }
  if (!phone) { showToast('⚠ Please enter a phone number'); return; }

  const { error } = await supabase.from('donors').insert([{
    name, phone_number: phone, paid: false
  }]);
  if (error) { showToast('⚠ Failed to add: ' + error.message); return; }

  document.getElementById('inp-name').value  = '';
  document.getElementById('inp-phone').value = '';

  showToast('✓ Donor added successfully');
  await renderRecent();
}

/* ---------- RECENT (add-donor.html) ---------- */

async function renderRecent() {
  const el = document.getElementById('recent-list');
  if (!el) return;
  const donors = await loadDonors();
  const recent = donors.slice(0, 5);
  if (!recent.length) {
    el.innerHTML = '<div class="empty glass"><i class="ti ti-inbox"></i>No donors yet</div>';
    return;
  }
  el.innerHTML = `<div class="donor-list">${recent.map((d, i) => renderDonorCard(d, i)).join('')}</div>`;
}

/* ---------- DASHBOARD (dashboard.html) ---------- */

async function renderDashboard() {
  const donors = await loadDonors();
  const filter    = document.getElementById('filter-month')?.value || 'all';
  const sortOrder = document.getElementById('sort-order')?.value || 'month-desc';
  updateMonthFilter(donors, filter);

  // Stats always based on filter selection
  const list      = filter === 'all' ? donors : donors.filter(d => d.date?.startsWith(filter));
  const paid      = list.filter(d => d.paid);
  const unpaid    = list.filter(d => !d.paid);
  const totalPaid = paid.reduce((s, d) => s + parseFloat(d.amount || 0), 0);

  const statsEl = document.getElementById('stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#4ade80;"><i class="ti ti-currency-rupee"></i></span>
        <div class="stat-label">${filter === 'all' ? 'Total Collected' : formatMonth(filter) + ' Collected'}</div>
        <div class="stat-value green">&#8377;${totalPaid.toLocaleString('en-IN')}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#fbbf24;"><i class="ti ti-clock-pause"></i></span>
        <div class="stat-label">Pending Donors</div>
        <div class="stat-value amber">${unpaid.length}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#60a5fa;"><i class="ti ti-users"></i></span>
        <div class="stat-label">Total Donors</div>
        <div class="stat-value blue">${list.length}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#c084fc;"><i class="ti ti-circle-check"></i></span>
        <div class="stat-label">Paid Donors</div>
        <div class="stat-value purple">${paid.length}</div>
      </div>`;
  }

  const monthlyEl = document.getElementById('monthly-grid');
  if (monthlyEl) {
    // Always show all months in breakdown regardless of filter
    let allMonths = [...new Set(donors.map(d => d.date?.slice(0,7)).filter(Boolean))];

    // Build month data first for amount-based sorting
    const monthData = allMonths.map(m => {
      const mDonors  = donors.filter(d => d.date?.startsWith(m));
      const mPaid    = mDonors.filter(d => d.paid).reduce((s,d) => s + parseFloat(d.amount || 0), 0);
      const paidCount = mDonors.filter(d => d.paid).length;
      return { m, mDonors, mPaid, paidCount };
    });

    // Apply sort
    monthData.sort((a, b) => {
      if (sortOrder === 'month-desc')   return b.m.localeCompare(a.m);
      if (sortOrder === 'month-asc')    return a.m.localeCompare(b.m);
      if (sortOrder === 'amount-desc')  return b.mPaid - a.mPaid;
      if (sortOrder === 'amount-asc')   return a.mPaid - b.mPaid;
      return 0;
    });

    const maxAmt = Math.max(...monthData.map(d => d.mPaid), 1);

    if (!monthData.length) {
      monthlyEl.innerHTML = `<div class="empty glass"><i class="ti ti-calendar-off"></i>No payment data yet</div>`;
    } else {
      monthlyEl.innerHTML = monthData.map(({ m, mDonors, mPaid, paidCount }) => {
        const pct = Math.round((mPaid / maxAmt) * 100);
        const isFiltered = filter !== 'all' && m === filter;
        return `
          <div class="month-row glass" style="${isFiltered ? 'border:1px solid #4ade8055;' : ''}">
            <div class="month-name" style="${isFiltered ? 'color:#4ade80;' : ''}">${formatMonth(m)}</div>
            <div class="month-bar-wrap">
              <div class="month-bar" style="width:${pct}%;${isFiltered ? 'background:#4ade80;' : ''}"></div>
            </div>
            <div class="month-amount" style="${isFiltered ? 'color:#4ade80;' : ''}">
              &#8377;${mPaid.toLocaleString('en-IN')}
            </div>
            <div class="month-count">${paidCount} paid / ${mDonors.length} total</div>
          </div>`;
      }).join('');
    }
  }

  const topEl = document.getElementById('top-donors');
  if (topEl) {
    const grouped = {};
    donors.forEach(d => {
      if (!d.paid || !d.amount) return;
      grouped[d.name] = (grouped[d.name] || 0) + parseFloat(d.amount);
    });
    const sorted = Object.entries(grouped).sort((a,b) => b[1]-a[1]).slice(0, 5);
    if (!sorted.length) {
      topEl.innerHTML = '<div class="empty glass"><i class="ti ti-trophy-off"></i>No paid donors yet</div>';
      return;
    }
    const rankClass = i => ['rank-1','rank-2','rank-3','rank-other','rank-other'][i] || 'rank-other';
    topEl.innerHTML = sorted.map(([name, total], i) => `
      <div class="top-donor-card glass">
        <div class="rank-badge ${rankClass(i)}">${i+1}</div>
        <div class="avatar">${getInitials(name)}</div>
        <div class="donor-info">
          <div class="donor-name">${escHtml(name)}</div>
          <div class="donor-meta">Total contributed</div>
        </div>
        <div class="donor-amount">&#8377;${total.toLocaleString('en-IN')}</div>
      </div>`).join('<div class="divider"></div>');
  }
}

/* ---------- INIT ---------- */

window.handleCardClick = handleCardClick;
window.toggleMenu      = toggleMenu;
window.markPaid        = markPaid;
window.undoPayment     = undoPayment;
window.deleteDonor     = deleteDonor;
window.addDonor        = addDonor;
window.renderList      = renderList;
window.renderDashboard = renderDashboard;

document.addEventListener('DOMContentLoaded', async () => {
  setupSearch();
  if (document.getElementById('donor-list'))  await renderList();
  if (document.getElementById('recent-list')) await renderRecent();
  if (document.getElementById('stats'))       await renderDashboard();
});