/* =============================================
   Hidayathul Islam Madrasa Committee
   app.js — All Logic
   ============================================= */

const STORAGE_KEY = 'him_donors_v1';

/* ---------- DATA ---------- */

function loadDonors() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || getSampleData();
  } catch (e) {
    return getSampleData();
  }
}

function saveDonors(donors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
}

function getSampleData() {
  const now  = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const prev2Month = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 7);
  return [
    { id: 1, name: 'Ahmed Ali',       phone: '+91 98765 43210', amount: 500,  month: thisMonth, paid: true  },
    { id: 2, name: 'Mohammed Rashid', phone: '+91 87654 32109', amount: 1000, month: thisMonth, paid: false },
    { id: 3, name: 'Fathima Beevi',   phone: '+91 76543 21098', amount: 750,  month: prevMonth, paid: true  },
    { id: 4, name: 'Ibrahim Khan',    phone: '+91 65432 10987', amount: 500,  month: prevMonth, paid: true  },
    { id: 5, name: 'Zainab Hussain',  phone: '+91 54321 09876', amount: 1500, month: prev2Month, paid: true },
    { id: 6, name: 'Abdul Kareem',    phone: '+91 43210 98765', amount: 800,  month: prev2Month, paid: true },
  ];
}

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

/* ---------- DONOR LIST (index.html) ---------- */

function updateMonthFilter(donors) {
  const sel = document.getElementById('filter-month');
  if (!sel) return;
  const current = sel.value;
  const months  = [...new Set(donors.map(d => d.month))].sort().reverse();
  sel.innerHTML = '<option value="all">All Months</option>';
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonth(m);
    sel.appendChild(opt);
  });
  if (months.includes(current)) sel.value = current;
}

function renderDonorCard(d, index) {
  return `
    ${index > 0 ? '<div class="divider"></div>' : ''}
    <div class="donor-card glass" id="card-${d.id}">
      <div class="avatar">${getInitials(d.name)}</div>
      <div class="donor-info">
        <div class="donor-name">${escHtml(d.name)}</div>
        <div class="donor-ph">
          <i class="ti ti-phone" style="font-size:11px;"></i>${escHtml(d.phone)}
        </div>
        <div class="donor-meta">
          <i class="ti ti-calendar" style="font-size:11px;"></i>${formatMonth(d.month)}
        </div>
        ${d.paid
          ? '<span class="badge badge-paid">&#10003; Paid</span>'
          : '<span class="badge badge-pending">&#9203; Pending</span>'}
      </div>
      <div class="donor-amount">&#8377;${d.amount.toLocaleString('en-IN')}</div>
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

function renderList() {
  const donors = loadDonors();
  updateMonthFilter(donors);

  const filter = document.getElementById('filter-month')?.value || 'all';
  const list   = filter === 'all' ? donors : donors.filter(d => d.month === filter);
  const el     = document.getElementById('donor-list');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = `<div class="empty glass">
      <i class="ti ti-database-off"></i>No donors found for this period</div>`;
    return;
  }
  el.innerHTML = list.map((d, i) => renderDonorCard(d, i)).join('');
}

/* ---------- ACTIONS ---------- */

function addDonor() {
  const name   = document.getElementById('inp-name')?.value.trim();
  const phone  = document.getElementById('inp-phone')?.value.trim();
  const amount = parseFloat(document.getElementById('inp-amount')?.value);
  const month  = document.getElementById('inp-month')?.value;

  if (!name)               { showToast('&#9888; Please enter a name');           return; }
  if (!phone)              { showToast('&#9888; Please enter a phone number');   return; }
  if (!amount || amount<=0){ showToast('&#9888; Please enter a valid amount');   return; }
  if (!month)              { showToast('&#9888; Please select a month');         return; }

  const donors = loadDonors();
  donors.unshift({ id: Date.now(), name, phone, amount, month, paid: false });
  saveDonors(donors);

  document.getElementById('inp-name').value   = '';
  document.getElementById('inp-phone').value  = '';
  document.getElementById('inp-amount').value = '';

  renderRecent();
  showToast('&#10003; Donor added successfully');
}

function togglePaid(id) {
  const donors = loadDonors();
  const donor  = donors.find(d => d.id === id);
  if (donor) {
    donor.paid = !donor.paid;
    saveDonors(donors);
    renderList();
    showToast(donor.paid ? '&#10003; Marked as paid' : 'Marked as pending');
  }
}

function deleteDonor(id) {
  if (!confirm('Remove this donor from the database?')) return;
  saveDonors(loadDonors().filter(d => d.id !== id));
  renderList();
  renderRecent();
  showToast('Donor removed');
}

/* ---------- RECENT (add-donor.html) ---------- */

function renderRecent() {
  const el = document.getElementById('recent-list');
  if (!el) return;
  const donors = loadDonors().slice(0, 5);
  if (!donors.length) {
    el.innerHTML = '<div class="empty glass"><i class="ti ti-inbox"></i>No donors yet</div>';
    return;
  }
  el.innerHTML = `<div class="donor-list">
    ${donors.map((d, i) => renderDonorCard(d, i)).join('')}
  </div>`;
}

/* ---------- DASHBOARD (dashboard.html) ---------- */

function renderDashboard() {
  const donors = loadDonors();
  updateMonthFilter(donors);

  const filter = document.getElementById('filter-month')?.value || 'all';
  const list   = filter === 'all' ? donors : donors.filter(d => d.month === filter);

  const paid       = list.filter(d => d.paid);
  const unpaid     = list.filter(d => !d.paid);
  const totalPaid  = paid.reduce((s, d) => s + d.amount, 0);
  const totalPend  = unpaid.reduce((s, d) => s + d.amount, 0);

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
    const allMonths = [...new Set(donors.map(d => d.month))].sort().reverse();
    const maxAmt    = Math.max(...allMonths.map(m =>
      donors.filter(d => d.month === m && d.paid).reduce((s,d) => s+d.amount, 0)
    ), 1);

    monthlyEl.innerHTML = allMonths.map(m => {
      const mDonors  = donors.filter(d => d.month === m);
      const mPaid    = mDonors.filter(d => d.paid).reduce((s,d) => s+d.amount, 0);
      const pct      = Math.round((mPaid / maxAmt) * 100);
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
      grouped[d.name] = (grouped[d.name] || 0) + d.amount;
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