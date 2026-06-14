/* =============================================
   Hidayathul Islam Madrasa Committee
   app.js — Supabase Edition
   ============================================= */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://qjwklmkxbezdatgtywwj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd2tsbWt4YmV6ZGF0Z3R5d3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDE1ODQsImV4cCI6MjA5NzAxNzU4NH0.X-O6lbVQSKPAEXyCXwM3FcsCBMFHWnaP519CKhHOlas';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tracks delete confirmation steps per donor id
const deleteConfirmState = {};

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

/* ---------- DATA (Supabase) ---------- */

async function loadDonors() {
  const { data, error } = await supabase
    .from('donors')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('⚠ Failed to load donors');
    console.error(error);
    return [];
  }
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
    <div class="donor-card glass" id="card-${d.id}">
      <div class="avatar">${getInitials(d.name)}</div>
      <div class="donor-info">
        <div class="donor-name">${escHtml(d.name)}</div>
        <div class="donor-ph">
          <i class="ti ti-phone" style="font-size:11px;"></i>${escHtml(d.phone_number)}
        </div>
        <div class="donor-meta">
          <i class="ti ti-calendar" style="font-size:11px;"></i>${formatMonth(month)}
        </div>
        ${d.paid
          ? '<span class="badge badge-paid">&#10003; Paid</span>'
          : '<span class="badge badge-pending">&#9203; Pending</span>'}
      </div>
      <div class="donor-amount">&#8377;${parseFloat(d.amount).toLocaleString('en-IN')}</div>
      <div class="donor-actions">
        <button class="tick-btn ${d.paid ? 'paid' : ''}"
                onclick="togglePaid(${d.id})"
                title="${d.paid ? 'Mark as unpaid' : 'Mark as paid'}">
          <i class="ti ti-check"></i>
        </button>
        <button class="del-btn"
                onclick="deleteDonor(${d.id})"
                title="Remove donor">
          <i class="ti ti-x"></i>
        </button>
      </div>
    </div>`;
}

/* ---------- DONOR LIST (index.html) ---------- */

async function renderList() {
  const donors = await loadDonors();
  const filter = document.getElementById('filter-month')?.value || 'all';
  updateMonthFilter(donors, filter);

  const list = filter === 'all' ? donors : donors.filter(d => d.date?.startsWith(filter));
  const el   = document.getElementById('donor-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="empty glass">
      <i class="ti ti-database-off"></i>No donors found for this period</div>`;
    return;
  }
  el.innerHTML = list.map((d, i) => renderDonorCard(d, i)).join('');
}

/* ---------- ACTIONS ---------- */

async function addDonor() {
  const name   = document.getElementById('inp-name')?.value.trim();
  const phone  = document.getElementById('inp-phone')?.value.trim();
  const amount = parseFloat(document.getElementById('inp-amount')?.value);
  const month  = document.getElementById('inp-month')?.value; // expects YYYY-MM

  if (!name)               { showToast('⚠ Please enter a name');           return; }
  if (!phone)              { showToast('⚠ Please enter a phone number');   return; }
  if (!amount || amount<=0){ showToast('⚠ Please enter a valid amount');   return; }
  if (!month)              { showToast('⚠ Please select a month');         return; }

  const date = month + '-01';

  const { error } = await supabase.from('donors').insert([{
    name,
    phone_number: phone,
    amount,
    date,
    paid: false
  }]);

  if (error) { showToast('⚠ Failed to add donor: ' + error.message); return; }

  document.getElementById('inp-name').value   = '';
  document.getElementById('inp-phone').value  = '';
  document.getElementById('inp-amount').value = '';

  showToast('✓ Donor added successfully');
  await renderRecent();
}

async function togglePaid(id) {
  const { data, error: fetchErr } = await supabase
    .from('donors').select('paid').eq('id', id).single();

  if (fetchErr) { showToast('⚠ Failed to update'); return; }

  const { error } = await supabase
    .from('donors').update({ paid: !data.paid }).eq('id', id);

  if (error) { showToast('⚠ Failed to update'); return; }

  showToast(!data.paid ? '✓ Marked as paid' : 'Marked as pending');
  await renderList();
}

function deleteDonor(id) {
  if (!deleteConfirmState[id]) {
    // Step 1 — change button to red "Confirm?" state
    deleteConfirmState[id] = true;
    const btn = document.querySelector(`#card-${id} .del-btn`);
    if (btn) {
      btn.innerHTML = '<i class="ti ti-alert-triangle"></i> Delete?';
      btn.style.cssText = 'background:#dc2626;color:#fff;padding:0 10px;border-radius:6px;font-size:12px;width:auto;';
    }
    // Auto-reset after 4 seconds if no second click
    setTimeout(() => {
      delete deleteConfirmState[id];
      const b = document.querySelector(`#card-${id} .del-btn`);
      if (b) {
        b.innerHTML = '<i class="ti ti-x"></i>';
        b.style.cssText = '';
      }
    }, 4000);
  } else {
    // Step 2 — show red modal popup
    delete deleteConfirmState[id];
    showDeleteModal(id);
  }
}

function showDeleteModal(id) {
  // Remove any existing modal
  document.getElementById('delete-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'delete-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);
    display:flex;align-items:center;justify-content:center;z-index:9999;`;

  modal.innerHTML = `
    <div style="background:#1a1a1a;border:2px solid #dc2626;border-radius:14px;
                padding:28px 32px;max-width:340px;width:90%;text-align:center;box-shadow:0 0 40px rgba(220,38,38,0.4);">
      <div style="font-size:40px;margin-bottom:12px;">🗑️</div>
      <h3 style="color:#dc2626;font-size:18px;margin:0 0 8px;">Delete Donor?</h3>
      <p style="color:#aaa;font-size:13px;margin:0 0 24px;">
        This action is <strong style="color:#fff;">permanent</strong> and cannot be undone.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="modal-cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid #444;
          background:#2a2a2a;color:#fff;cursor:pointer;font-size:14px;">
          Cancel
        </button>
        <button id="modal-confirm" style="flex:1;padding:10px;border-radius:8px;border:none;
          background:#dc2626;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">
          Yes, Delete
        </button>
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
  el.innerHTML = `<div class="donor-list">
    ${recent.map((d, i) => renderDonorCard(d, i)).join('')}
  </div>`;
}

/* ---------- DASHBOARD (dashboard.html) ---------- */

async function renderDashboard() {
  const donors = await loadDonors();
  const filter = document.getElementById('filter-month')?.value || 'all';
  updateMonthFilter(donors, filter);

  const list   = filter === 'all' ? donors : donors.filter(d => d.date?.startsWith(filter));
  const paid   = list.filter(d => d.paid);
  const unpaid = list.filter(d => !d.paid);
  const totalPaid = paid.reduce((s, d)   => s + parseFloat(d.amount), 0);
  const totalPend = unpaid.reduce((s, d) => s + parseFloat(d.amount), 0);

  /* Stats */
  const statsEl = document.getElementById('stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#4ade80;"><i class="ti ti-currency-rupee"></i></span>
        <div class="stat-label">Total Collected</div>
        <div class="stat-value green">&#8377;${totalPaid.toLocaleString('en-IN')}</div>
      </div>
      <div class="stat-card glass">
        <span class="stat-icon" style="color:#fbbf24;"><i class="ti ti-clock-pause"></i></span>
        <div class="stat-label">Pending</div>
        <div class="stat-value amber">&#8377;${totalPend.toLocaleString('en-IN')}</div>
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

  /* Monthly Breakdown */
  const monthlyEl = document.getElementById('monthly-grid');
  if (monthlyEl) {
    const allMonths = [...new Set(donors.map(d => d.date?.slice(0,7)).filter(Boolean))].sort().reverse();
    const maxAmt    = Math.max(...allMonths.map(m =>
      donors.filter(d => d.date?.startsWith(m) && d.paid).reduce((s,d) => s + parseFloat(d.amount), 0)
    ), 1);

    monthlyEl.innerHTML = allMonths.map(m => {
      const mDonors = donors.filter(d => d.date?.startsWith(m));
      const mPaid   = mDonors.filter(d => d.paid).reduce((s,d) => s + parseFloat(d.amount), 0);
      const pct     = Math.round((mPaid / maxAmt) * 100);
      return `
        <div class="month-row glass">
          <div class="month-name">${formatMonth(m)}</div>
          <div class="month-bar-wrap">
            <div class="month-bar" style="width:${pct}%"></div>
          </div>
          <div class="month-amount">&#8377;${mPaid.toLocaleString('en-IN')}</div>
          <div class="month-count">${mDonors.length} donor${mDonors.length !== 1 ? 's' : ''}</div>
        </div>`;
    }).join('');
  }

  /* Top Donors */
  const topEl = document.getElementById('top-donors');
  if (topEl) {
    const grouped = {};
    donors.forEach(d => {
      if (!d.paid) return;
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

// Expose to HTML onclick handlers
window.togglePaid      = togglePaid;
window.deleteDonor     = deleteDonor;
window.showDeleteModal = showDeleteModal;
window.addDonor        = addDonor;
window.renderList      = renderList;
window.renderDashboard = renderDashboard;

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('donor-list'))  await renderList();
  if (document.getElementById('recent-list')) await renderRecent();
  if (document.getElementById('stats'))       await renderDashboard();
});