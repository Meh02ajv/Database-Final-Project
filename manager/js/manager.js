// ===== GRAND HORIZON HOTEL — MANAGER PORTAL =====
// Role-based interface: Administrator | Event Staff | Finance/Billing Staff
const API = '/api';
let mgrToken  = null;
let mgrRole   = null;
let mgrName   = null;
let selectedRoomNum    = null;
let selectedInvoiceId  = null;
let selectedEventId    = null;
let selectedStaffId    = null;
let roomCategories     = [];

// ── Role constants ────────────────────────────────────────────────────────────
const ROLE = {
  ADMIN:   'Administrator',
  EVENT:   'Event Staff',
  FINANCE: 'Finance/Billing Staff'
};

// ── Role config: banner colour, icon, subtitle ────────────────────────────────
const ROLE_CONFIG = {
  [ROLE.ADMIN]: {
    color:    'linear-gradient(135deg, #1F4E79 0%, #2563a8 100%)',
    icon:     '🔑',
    title:    'Administrator Dashboard',
    subtitle: 'Full system access — staff, rooms, reservations, events, finance & reports',
    navId:    'nav-admin',
    badge:    '🔑 Administrator'
  },
  [ROLE.EVENT]: {
    color:    'linear-gradient(135deg, #065f46 0%, #059669 100%)',
    icon:     '🎪',
    title:    'Event Staff Dashboard',
    subtitle: 'Manage event bookings, hall schedules, reservations & check-ins',
    navId:    'nav-event',
    badge:    '🎪 Event Staff'
  },
  [ROLE.FINANCE]: {
    color:    'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
    icon:     '💰',
    title:    'Finance & Billing Dashboard',
    subtitle: 'Manage invoices, record payments & generate revenue reports',
    navId:    'nav-finance',
    badge:    '💰 Finance Staff'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
  const token = sessionStorage.getItem('mgr_token');
  const role  = sessionStorage.getItem('mgr_role');
  const name  = sessionStorage.getItem('mgr_name');
  if (token && role) {
    mgrToken = token;
    mgrRole  = role;
    mgrName  = name;
    showDashboard();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
async function doManagerLogin() {
  const email    = document.getElementById('mgr-username').value.trim();
  const password = document.getElementById('mgr-password').value;
  if (!email || !password) return showLoginAlert('Please enter your email and password.', 'danger');
  try {
    const res  = await fetch(`${API}/auth/staff/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: email, Password: password })
    });
    const data = await res.json();
    if (!res.ok) return showLoginAlert(data.error, 'danger');
    mgrToken = data.token;
    mgrRole  = data.role;
    mgrName  = data.FirstName;
    sessionStorage.setItem('mgr_token', mgrToken);
    sessionStorage.setItem('mgr_role',  mgrRole);
    sessionStorage.setItem('mgr_name',  mgrName);
    showDashboard();
  } catch { showLoginAlert('Connection error. Is the server running?', 'danger'); }
}

function showLoginAlert(msg, type) {
  document.getElementById('login-alert').innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display    = 'flex';
  applyRoleUI();
  loadDashboard();
  loadTodayActivity();
}

function doLogout() {
  sessionStorage.clear();
  mgrToken = mgrRole = mgrName = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display    = 'none';
  document.getElementById('mgr-username').value = '';
  document.getElementById('mgr-password').value = '';
  document.getElementById('login-alert').innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE UI
// ═══════════════════════════════════════════════════════════════════════════════
function applyRoleUI() {
  const cfg = ROLE_CONFIG[mgrRole] || ROLE_CONFIG[ROLE.ADMIN];
  ['nav-admin', 'nav-event', 'nav-finance'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(cfg.navId).style.display = 'block';
  document.getElementById('sidebar-role-label').textContent  = mgrRole;
  document.getElementById('sidebar-user-info').textContent   = `👤 ${mgrName || 'Staff'}`;
  document.getElementById('topbar-role-badge').textContent   = cfg.badge;
  document.getElementById('role-welcome-banner').style.background = cfg.color;
  document.getElementById('banner-icon').textContent    = cfg.icon;
  document.getElementById('banner-title').textContent   = `Welcome, ${mgrName || 'Staff'}!`;
  document.getElementById('banner-subtitle').textContent = cfg.subtitle;
  document.getElementById('dashboard-greeting').textContent = `${cfg.icon} ${cfg.title}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════
function showSection(id, navEl) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(id).style.display = 'block';
  if (navEl) navEl.classList.add('active');
  const titles = {
    'dashboard-home':'Dashboard', 'section-staff':'Staff Management',
    'section-rooms':'Room Management', 'section-reservations':'Reservations',
    'section-events':'Event Bookings', 'section-invoices':'Invoice Management',
    'section-reports':'Reports & Analytics', 'section-feedback':'Customer Feedback'
  };
  document.getElementById('topbar-title').textContent = titles[id] || '';
  if (id === 'section-staff')        loadStaff();
  if (id === 'section-rooms')        loadRooms();
  if (id === 'section-reservations') loadReservations();
  if (id === 'section-events')       loadEvents();
  if (id === 'section-invoices')     loadInvoices();
  if (id === 'section-reports')      loadReports();
  if (id === 'section-feedback')     loadFeedback();
}

function switchTab(tabId, btn) {
  document.querySelectorAll('#section-rooms [id$="-view"]').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS & ALERTS
// ═══════════════════════════════════════════════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function showAlert(msg, type = 'info') {
  const el    = document.getElementById('global-alert');
  const msgEl = document.getElementById('global-alert-msg');
  msgEl.className   = `alert alert-${type}`;
  msgEl.textContent = msg;
  el.style.display  = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4500);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${mgrToken}` });
const fmtDate     = d => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtDateTime = d => d ? new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

function statusBadge(s) {
  return {
    'Confirmed':'badge-info','Checked-In':'badge-success','Checked-Out':'badge-muted',
    'Cancelled':'badge-danger','Completed':'badge-success','In Progress':'badge-warning',
    'Available':'badge-success','Reserved':'badge-info','Occupied':'badge-warning',
    'Under Maintenance':'badge-danger'
  }[s] || 'badge-muted';
}
function payBadge(s) {
  return { 'Paid':'badge-success','Unpaid':'badge-danger','Partially Paid':'badge-warning' }[s] || 'badge-muted';
}
function roomTileColor(s) {
  return { 'Available':'#16a34a','Reserved':'#2563eb','Occupied':'#d97706','Under Maintenance':'#dc2626' }[s] || '#6b7280';
}
function roleBadgeColor(r) {
  return { 'Administrator':'badge-danger','Event Staff':'badge-success','Finance/Billing Staff':'badge-warning' }[r] || 'badge-muted';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function loadDashboard() {
  document.getElementById('stats-grid').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/reports/dashboard`, { headers: authHeaders() });
    const d   = await res.json();
    const { occupancy, guests, todayActivity, revenue, upcomingEvents, customers, staffSummary } = d;
    let statsHTML = '';

    if (mgrRole === ROLE.ADMIN) {
      statsHTML = `
        <div class="stat-card" style="--stat-color:#16a34a;"><div class="stat-label">Available Rooms</div><div class="stat-value">${occupancy.Available}</div><div class="stat-sub">of ${occupancy.TotalRooms} total rooms</div></div>
        <div class="stat-card" style="--stat-color:#2563eb;"><div class="stat-label">Reserved</div><div class="stat-value">${occupancy.Reserved}</div><div class="stat-sub">rooms confirmed</div></div>
        <div class="stat-card" style="--stat-color:#d97706;"><div class="stat-label">Occupied</div><div class="stat-value">${occupancy.Occupied}</div><div class="stat-sub">${guests.TotalOccupants || 0} guests in-house</div></div>
        <div class="stat-card" style="--stat-color:#dc2626;"><div class="stat-label">Maintenance</div><div class="stat-value">${occupancy.UnderMaintenance}</div><div class="stat-sub">rooms unavailable</div></div>
        <div class="stat-card" style="--stat-color:#7c3aed;"><div class="stat-label">Today Check-Ins</div><div class="stat-value">${todayActivity.TodayCheckIns || 0}</div><div class="stat-sub">expected arrivals</div></div>
        <div class="stat-card" style="--stat-color:#0891b2;"><div class="stat-label">Today Check-Outs</div><div class="stat-value">${todayActivity.TodayCheckOuts || 0}</div><div class="stat-sub">expected departures</div></div>
        <div class="stat-card" style="--stat-color:#c9a84c;"><div class="stat-label">Total Revenue</div><div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.TotalRevenue).toLocaleString()}</div><div class="stat-sub">$${parseFloat(revenue.OutstandingBalance).toLocaleString()} outstanding</div></div>
        <div class="stat-card" style="--stat-color:#1F4E79;"><div class="stat-label">Active Staff</div><div class="stat-value">${staffSummary?.ActiveStaff || 0}</div><div class="stat-sub">of ${staffSummary?.TotalStaff || 0} total staff</div></div>
      `;
      document.getElementById('today-activity').style.display = 'grid';
      document.getElementById('finance-summary').style.display = 'none';

    } else if (mgrRole === ROLE.EVENT) {
      statsHTML = `
        <div class="stat-card" style="--stat-color:#16a34a;"><div class="stat-label">Available Rooms</div><div class="stat-value">${occupancy.Available}</div><div class="stat-sub">of ${occupancy.TotalRooms} total</div></div>
        <div class="stat-card" style="--stat-color:#d97706;"><div class="stat-label">Guests In-House</div><div class="stat-value">${guests.TotalOccupants || 0}</div><div class="stat-sub">${guests.CurrentGuests || 0} active reservations</div></div>
        <div class="stat-card" style="--stat-color:#7c3aed;"><div class="stat-label">Today Check-Ins</div><div class="stat-value">${todayActivity.TodayCheckIns || 0}</div><div class="stat-sub">expected arrivals today</div></div>
        <div class="stat-card" style="--stat-color:#0891b2;"><div class="stat-label">Today Check-Outs</div><div class="stat-value">${todayActivity.TodayCheckOuts || 0}</div><div class="stat-sub">expected departures today</div></div>
        <div class="stat-card" style="--stat-color:#059669;"><div class="stat-label">Upcoming Events</div><div class="stat-value">${upcomingEvents.UpcomingEvents}</div><div class="stat-sub">confirmed future events</div></div>
        <div class="stat-card" style="--stat-color:#1F4E79;"><div class="stat-label">Total Customers</div><div class="stat-value">${customers.TotalCustomers}</div><div class="stat-sub">registered guests</div></div>
      `;
      document.getElementById('today-activity').style.display = 'grid';
      document.getElementById('finance-summary').style.display = 'none';

    } else if (mgrRole === ROLE.FINANCE) {
      statsHTML = `
        <div class="stat-card" style="--stat-color:#16a34a;"><div class="stat-label">Total Revenue</div><div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.TotalRevenue).toLocaleString()}</div><div class="stat-sub">all invoices combined</div></div>
        <div class="stat-card" style="--stat-color:#dc2626;"><div class="stat-label">Outstanding Balance</div><div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.OutstandingBalance).toLocaleString()}</div><div class="stat-sub">unpaid invoices</div></div>
        <div class="stat-card" style="--stat-color:#2563eb;"><div class="stat-label">Room Revenue</div><div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.TotalRoomRevenue || 0).toLocaleString()}</div><div class="stat-sub">from room reservations</div></div>
        <div class="stat-card" style="--stat-color:#059669;"><div class="stat-label">Event Revenue</div><div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.TotalEventRevenue || 0).toLocaleString()}</div><div class="stat-sub">from event bookings</div></div>
        <div class="stat-card" style="--stat-color:#d97706;"><div class="stat-label">Additional Charges</div><div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.TotalAdditionalRevenue || 0).toLocaleString()}</div><div class="stat-sub">late fees & extras</div></div>
        <div class="stat-card" style="--stat-color:#7c3aed;"><div class="stat-label">Upcoming Events</div><div class="stat-value">${upcomingEvents.UpcomingEvents}</div><div class="stat-sub">pending event invoices</div></div>
      `;
      document.getElementById('today-activity').style.display = 'none';
      document.getElementById('finance-summary').style.display = 'block';
      document.getElementById('revenue-breakdown-cards').innerHTML = `
        <div class="stat-card" style="--stat-color:#16a34a; padding:1rem;"><div class="stat-label">Room Revenue</div><div class="stat-value" style="font-size:1.4rem;">$${parseFloat(revenue.TotalRoomRevenue || 0).toLocaleString()}</div></div>
        <div class="stat-card" style="--stat-color:#2563eb; padding:1rem;"><div class="stat-label">Event Revenue</div><div class="stat-value" style="font-size:1.4rem;">$${parseFloat(revenue.TotalEventRevenue || 0).toLocaleString()}</div></div>
        <div class="stat-card" style="--stat-color:#d97706; padding:1rem;"><div class="stat-label">Additional Charges</div><div class="stat-value" style="font-size:1.4rem;">$${parseFloat(revenue.TotalAdditionalRevenue || 0).toLocaleString()}</div></div>
        <div class="stat-card" style="--stat-color:#1F4E79; padding:1rem;"><div class="stat-label">Grand Total</div><div class="stat-value" style="font-size:1.4rem;">$${parseFloat(revenue.TotalRevenue).toLocaleString()}</div></div>
        <div class="stat-card" style="--stat-color:#dc2626; padding:1rem;"><div class="stat-label">Outstanding</div><div class="stat-value" style="font-size:1.4rem;">$${parseFloat(revenue.OutstandingBalance).toLocaleString()}</div></div>
      `;
    }
    document.getElementById('stats-grid').innerHTML = statsHTML;
  } catch (e) {
    document.getElementById('stats-grid').innerHTML = '<div class="alert alert-danger">Failed to load dashboard. Is the server running?</div>';
  }
}

async function loadTodayActivity() {
  try {
    const res  = await fetch(`${API}/reservations?date=${new Date().toISOString().slice(0,10)}`, { headers: authHeaders() });
    const data = await res.json();
    const today     = new Date().toDateString();
    const checkIns  = data.filter(r => new Date(r.CheckInDate).toDateString()  === today);
    const checkOuts = data.filter(r => new Date(r.CheckOutDate).toDateString() === today);
    const renderList = items => items.length ? items.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
        <div><div style="font-weight:600;">${r.GuestName}</div><div style="color:var(--text-muted);">Room ${r.RoomNumber} · ${r.BookingReference}</div></div>
        <span class="badge ${statusBadge(r.Status)}">${r.Status}</span>
      </div>
    `).join('') : '<div class="empty-state" style="padding:1rem; font-size:0.85rem;">No activity today</div>';
    document.getElementById('today-checkins').innerHTML  = renderList(checkIns);
    document.getElementById('today-checkouts').innerHTML = renderList(checkOuts);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF MANAGEMENT (Administrator only)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadStaff() {
  const roleFilter   = document.getElementById('staff-role-filter')?.value   || '';
  const activeFilter = document.getElementById('staff-active-filter')?.value || '';
  try {
    const res  = await fetch(`${API}/auth/staff`, { headers: authHeaders() });
    const data = await res.json();
    let filtered = data;
    if (roleFilter)       filtered = filtered.filter(s => s.Role === roleFilter);
    if (activeFilter !== '') filtered = filtered.filter(s => String(s.IsActive) === activeFilter);
    const tbody = document.getElementById('staff-table-body');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No staff found.</td></tr>'; return; }
    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td>${s.StaffID}</td>
        <td><strong>${s.FirstName} ${s.LastName}</strong></td>
        <td style="font-size:0.82rem;">${s.Email}</td>
        <td><span class="badge ${roleBadgeColor(s.Role)}">${s.Role}</span></td>
        <td><span class="badge ${s.IsActive ? 'badge-success' : 'badge-danger'}">${s.IsActive ? 'Active' : 'Inactive'}</span></td>
        <td style="font-size:0.8rem;">${fmtDate(s.CreatedAt)}</td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-outline btn-sm" onclick="openEditStaff(${s.StaffID}, '${s.FirstName}', '${s.LastName}', '${s.Email}', '${s.Role}', ${s.IsActive})">✏️ Edit</button>
            ${s.IsActive
              ? `<button class="btn btn-danger btn-sm" onclick="deactivateStaff(${s.StaffID}, '${s.FirstName}')">🚫 Deactivate</button>`
              : `<button class="btn btn-success btn-sm" onclick="activateStaff(${s.StaffID})">✅ Activate</button>`}
          </div>
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load staff.', 'danger'); }
}

function openCreateStaff() {
  selectedStaffId = null;
  document.getElementById('staff-modal-title').textContent = '👥 Add Staff Member';
  document.getElementById('staff-firstname').value  = '';
  document.getElementById('staff-lastname').value   = '';
  document.getElementById('staff-email').value      = '';
  document.getElementById('staff-password').value   = '';
  document.getElementById('staff-role').value       = 'Event Staff';
  document.getElementById('staff-password-group').style.display = 'block';
  document.getElementById('staff-active-group').style.display   = 'none';
  document.getElementById('staff-form-alert').innerHTML = '';
  openModal('modal-staff-form');
}

function openEditStaff(id, first, last, email, role, isActive) {
  selectedStaffId = id;
  document.getElementById('staff-modal-title').textContent = `✏️ Edit Staff — ${first} ${last}`;
  document.getElementById('staff-firstname').value  = first;
  document.getElementById('staff-lastname').value   = last;
  document.getElementById('staff-email').value      = email;
  document.getElementById('staff-password').value   = '';
  document.getElementById('staff-role').value       = role;
  document.getElementById('staff-active').value     = isActive ? '1' : '0';
  document.getElementById('staff-password-group').style.display = 'none';
  document.getElementById('staff-active-group').style.display   = 'block';
  document.getElementById('staff-form-alert').innerHTML = '';
  openModal('modal-staff-form');
}

async function saveStaff() {
  const isEdit  = selectedStaffId !== null;
  const alertEl = document.getElementById('staff-form-alert');
  if (isEdit) {
    const body = {
      FirstName: document.getElementById('staff-firstname').value.trim(),
      LastName:  document.getElementById('staff-lastname').value.trim(),
      Role:      document.getElementById('staff-role').value,
      IsActive:  parseInt(document.getElementById('staff-active').value)
    };
    try {
      const res  = await fetch(`${API}/auth/staff/${selectedStaffId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return alertEl.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
      closeModal('modal-staff-form');
      showAlert('Staff account updated successfully.', 'success');
      loadStaff();
    } catch { showAlert('Error updating staff.', 'danger'); }
  } else {
    const body = {
      FirstName: document.getElementById('staff-firstname').value.trim(),
      LastName:  document.getElementById('staff-lastname').value.trim(),
      Email:     document.getElementById('staff-email').value.trim(),
      Password:  document.getElementById('staff-password').value,
      Role:      document.getElementById('staff-role').value
    };
    if (!body.FirstName || !body.LastName || !body.Email || !body.Password)
      return alertEl.innerHTML = '<div class="alert alert-danger">All fields are required.</div>';
    try {
      const res  = await fetch(`${API}/auth/staff/create`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return alertEl.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
      closeModal('modal-staff-form');
      showAlert(`Staff account created for ${body.FirstName} ${body.LastName}.`, 'success');
      loadStaff();
    } catch { showAlert('Error creating staff.', 'danger'); }
  }
}

async function deactivateStaff(id, name) {
  if (!confirm(`Deactivate ${name}'s account? They will no longer be able to log in.`)) return;
  try {
    const res  = await fetch(`${API}/auth/staff/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert(`${name}'s account has been deactivated.`, 'success');
    loadStaff();
  } catch { showAlert('Error deactivating staff.', 'danger'); }
}

async function activateStaff(id) {
  try {
    const res  = await fetch(`${API}/auth/staff/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ IsActive: 1 }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Staff account reactivated.', 'success');
    loadStaff();
  } catch { showAlert('Error activating staff.', 'danger'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS (Administrator only)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadRoomCategories() {
  try {
    const res = await fetch(`${API}/rooms/categories`);
    roomCategories = await res.json();
  } catch {}
}

async function loadRooms() {
  await loadRoomCategories();
  const statusFilter = document.getElementById('room-status-filter')?.value || '';
  try {
    const res   = await fetch(`${API}/rooms/all`, { headers: authHeaders() });
    const rooms = await res.json();
    const filtered = statusFilter ? rooms.filter(r => r.Status === statusFilter) : rooms;
    document.getElementById('room-grid-container').innerHTML = filtered.map(r => `
      <div class="room-tile" style="--tile-color:${roomTileColor(r.Status)};">
        <div class="room-num">${r.RoomNumber}</div>
        <div class="room-cat">${r.CategoryName}</div>
        <div class="room-status">${r.Status}</div>
        <div style="margin-top:0.5rem; display:flex; gap:0.25rem; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" style="font-size:0.65rem; padding:0.2rem 0.45rem;" onclick="openEditRoom('${r.RoomNumber}', ${r.CategoryID}, ${r.Floor}, ${r.MaxOccupants}, '${r.Status}')">✏️</button>
          <button class="btn btn-danger btn-sm" style="font-size:0.65rem; padding:0.2rem 0.45rem;" onclick="deleteRoom('${r.RoomNumber}')">🗑️</button>
        </div>
      </div>
    `).join('');
    document.getElementById('rooms-table-body').innerHTML = filtered.map(r => `
      <tr>
        <td><strong>${r.RoomNumber}</strong></td>
        <td>${r.CategoryName}</td>
        <td>${r.Floor}</td>
        <td>${r.MaxOccupants}</td>
        <td>$${r.PricePerNight}</td>
        <td><span class="badge ${statusBadge(r.Status)}">${r.Status}</span></td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-outline btn-sm" onclick="openEditRoom('${r.RoomNumber}', ${r.CategoryID}, ${r.Floor}, ${r.MaxOccupants}, '${r.Status}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteRoom('${r.RoomNumber}')">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load rooms.', 'danger'); }
}

function openCreateRoom() {
  selectedRoomNum = null;
  document.getElementById('room-modal-title').textContent      = '🛏 Create New Room';
  document.getElementById('room-form-roomnumber').value        = '';
  document.getElementById('room-form-roomnumber').disabled     = false;
  document.getElementById('room-form-floor').value             = '';
  document.getElementById('room-form-maxocc').value            = '';
  document.getElementById('room-form-status').value            = 'Available';
  const sel = document.getElementById('room-form-category');
  sel.innerHTML = roomCategories.map(c => `<option value="${c.CategoryID}">${c.CategoryName} — $${c.PricePerNight}/night</option>`).join('');
  document.getElementById('room-form-alert').innerHTML = '';
  openModal('modal-room-form');
}

function openEditRoom(roomNum, categoryID, floor, maxOcc, status) {
  selectedRoomNum = roomNum;
  document.getElementById('room-modal-title').textContent      = `✏️ Edit Room ${roomNum}`;
  document.getElementById('room-form-roomnumber').value        = roomNum;
  document.getElementById('room-form-roomnumber').disabled     = true;
  document.getElementById('room-form-floor').value             = floor;
  document.getElementById('room-form-maxocc').value            = maxOcc;
  document.getElementById('room-form-status').value            = status;
  const sel = document.getElementById('room-form-category');
  sel.innerHTML = roomCategories.map(c => `<option value="${c.CategoryID}" ${c.CategoryID === categoryID ? 'selected' : ''}>${c.CategoryName} — $${c.PricePerNight}/night</option>`).join('');
  document.getElementById('room-form-alert').innerHTML = '';
  openModal('modal-room-form');
}

async function saveRoom() {
  const roomNumber = document.getElementById('room-form-roomnumber').value.trim();
  const categoryID = parseInt(document.getElementById('room-form-category').value);
  const floor      = parseInt(document.getElementById('room-form-floor').value);
  const maxOcc     = parseInt(document.getElementById('room-form-maxocc').value);
  const status     = document.getElementById('room-form-status').value;
  if (!roomNumber || !categoryID || isNaN(floor) || !maxOcc)
    return document.getElementById('room-form-alert').innerHTML = '<div class="alert alert-danger">All fields are required.</div>';
  const isEdit = selectedRoomNum !== null;
  const url    = isEdit ? `${API}/rooms/${selectedRoomNum}` : `${API}/rooms`;
  const method = isEdit ? 'PUT' : 'POST';
  const body   = isEdit
    ? { CategoryID: categoryID, Floor: floor, MaxOccupants: maxOcc, Status: status }
    : { RoomNumber: roomNumber, CategoryID: categoryID, Floor: floor, MaxOccupants: maxOcc, Status: status };
  try {
    const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return document.getElementById('room-form-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-room-form');
    showAlert(isEdit ? `Room ${selectedRoomNum} updated.` : `Room ${roomNumber} created.`, 'success');
    loadRooms();
  } catch { showAlert('Error saving room.', 'danger'); }
}

async function deleteRoom(roomNum) {
  if (!confirm(`Delete Room ${roomNum}? This cannot be undone.`)) return;
  try {
    const res  = await fetch(`${API}/rooms/${roomNum}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert(`Room ${roomNum} deleted.`, 'success');
    loadRooms();
  } catch { showAlert('Error deleting room.', 'danger'); }
}

function openRoomStatus(roomNum, currentStatus) {
  selectedRoomNum = roomNum;
  document.getElementById('room-status-info').textContent = `Room ${roomNum} — Current: ${currentStatus}`;
  document.getElementById('new-room-status').value        = currentStatus;
  document.getElementById('room-status-alert').innerHTML  = '';
  openModal('modal-room-status');
}

async function confirmRoomStatus() {
  const status = document.getElementById('new-room-status').value;
  try {
    const res  = await fetch(`${API}/rooms/${selectedRoomNum}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) return document.getElementById('room-status-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-room-status');
    showAlert(`Room ${selectedRoomNum} updated to ${status}.`, 'success');
    loadRooms();
  } catch { showAlert('Error updating room.', 'danger'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESERVATIONS (Administrator + Event Staff)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadReservations() {
  const params = new URLSearchParams();
  const search = document.getElementById('res-search')?.value;
  const status = document.getElementById('res-status')?.value;
  const date   = document.getElementById('res-date')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (date)   params.set('date', date);
  try {
    const res  = await fetch(`${API}/reservations?${params}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('reservations-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No reservations found.</td></tr>'; return; }
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.ReservationID}</td>
        <td style="font-family:monospace; font-size:0.78rem;">${r.BookingReference}</td>
        <td><div style="font-weight:600;">${r.GuestName}</div><div style="font-size:0.75rem; color:var(--text-muted);">${r.ContactNumber}</div></td>
        <td>${r.RoomNumber} <span style="color:var(--text-muted); font-size:0.75rem;">${r.CategoryName}</span></td>
        <td>${fmtDate(r.CheckInDate)}</td>
        <td>${fmtDate(r.CheckOutDate)}</td>
        <td>${r.NumOccupants}</td>
        <td><span class="badge ${statusBadge(r.Status)}">${r.Status}</span></td>
        <td>${r.TotalAmount ? `<div>$${r.TotalAmount}</div><span class="badge ${payBadge(r.PaymentStatus)}">${r.PaymentStatus}</span>` : '—'}</td>
        <td>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
            ${r.Status === 'Confirmed' ? `<button class="btn btn-success btn-sm" onclick="checkIn(${r.ReservationID})">Check-In</button>` : ''}
            ${r.Status === 'Checked-In' ? `<button class="btn btn-warning btn-sm" onclick="checkOut(${r.ReservationID})">Check-Out</button>` : ''}
            ${r.InvoiceID && r.PaymentStatus !== 'Paid' ? `<button class="btn btn-primary btn-sm" onclick="openPaymentDirect(${r.InvoiceID}, ${r.TotalAmount})">💳 Pay</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load reservations.', 'danger'); }
}

function clearResFilters() {
  ['res-search','res-date'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('res-status').value = '';
  loadReservations();
}

async function checkIn(id) {
  if (!confirm('Check in this guest?')) return;
  try {
    const res  = await fetch(`${API}/reservations/${id}/checkin`, { method: 'PUT', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Guest checked in successfully! ✅', 'success');
    loadReservations(); loadDashboard();
  } catch { showAlert('Error during check-in.', 'danger'); }
}

async function checkOut(id) {
  const fee = parseFloat(prompt('Late check-out fee (enter 0 if none):', '0') || '0');
  try {
    const res  = await fetch(`${API}/reservations/${id}/checkout`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ lateCheckoutFee: fee }) });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Guest checked out successfully! ✅', 'success');
    loadReservations(); loadDashboard();
  } catch { showAlert('Error during check-out.', 'danger'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS (Administrator + Event Staff)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadEvents() {
  const params = new URLSearchParams();
  const search = document.getElementById('evt-search')?.value;
  const status = document.getElementById('evt-status')?.value;
  const date   = document.getElementById('evt-date')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (date)   params.set('date', date);
  try {
    const res  = await fetch(`${API}/events?${params}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('events-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No events found.</td></tr>'; return; }
    tbody.innerHTML = data.map(e => `
      <tr>
        <td>${e.EventID}</td>
        <td><div style="font-weight:600;">${e.CustomerName}</div><div style="font-size:0.75rem; color:var(--text-muted);">${e.ContactNumber}</div></td>
        <td>${e.HallName}</td>
        <td>${e.EventType}</td>
        <td>${fmtDate(e.EventDate)}</td>
        <td style="font-size:0.8rem;">${e.StartTime} – ${e.EndTime}</td>
        <td>${e.ExpectedAttendees}</td>
        <td><span class="badge ${statusBadge(e.Status)}">${e.Status}</span></td>
        <td>${e.TotalAmount ? `<div>$${e.TotalAmount}</div><span class="badge ${payBadge(e.PaymentStatus)}">${e.PaymentStatus}</span>` : '—'}</td>
        <td>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="openEventStatus(${e.EventID}, '${e.Status}', '${e.EventType}')">✏️ Status</button>
            ${e.InvoiceID && e.PaymentStatus !== 'Paid' ? `<button class="btn btn-primary btn-sm" onclick="openPaymentDirect(${e.InvoiceID}, ${e.TotalAmount})">💳 Pay</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load events.', 'danger'); }
}

function clearEvtFilters() {
  ['evt-search','evt-date'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('evt-status').value = '';
  loadEvents();
}

function openEventStatus(eventId, currentStatus, eventType) {
  selectedEventId = eventId;
  document.getElementById('event-status-info').textContent = `Event #${eventId}: ${eventType} — Current: ${currentStatus}`;
  document.getElementById('new-event-status').value        = currentStatus;
  document.getElementById('event-status-alert').innerHTML  = '';
  openModal('modal-event-status');
}

async function confirmEventStatus() {
  const status = document.getElementById('new-event-status').value;
  try {
    const res  = await fetch(`${API}/events/${selectedEventId}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status }) });
    const data = await res.json();
    if (!res.ok) return document.getElementById('event-status-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-event-status');
    showAlert(`Event status updated to ${status}.`, 'success');
    loadEvents();
  } catch { showAlert('Error updating event.', 'danger'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES (Administrator + Finance/Billing Staff)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadInvoices() {
  const params = new URLSearchParams();
  const search = document.getElementById('inv-search')?.value;
  const status = document.getElementById('inv-status')?.value;
  const type   = document.getElementById('inv-type')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (type)   params.set('type', type);
  try {
    const res  = await fetch(`${API}/invoices?${params}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('invoices-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No invoices found.</td></tr>'; return; }
    tbody.innerHTML = data.map(inv => `
      <tr>
        <td><strong>#${inv.InvoiceID}</strong></td>
        <td>${inv.CustomerName || '—'}</td>
        <td><span class="badge badge-muted" style="font-size:0.68rem;">${inv.InvoiceType}</span></td>
        <td style="font-family:monospace; font-size:0.78rem;">${inv.Reference}</td>
        <td>$${inv.RoomCharges}</td>
        <td>$${inv.EventCharges}</td>
        <td>$${inv.AdditionalCharges}</td>
        <td><strong>$${inv.TotalAmount}</strong></td>
        <td><span class="badge ${payBadge(inv.PaymentStatus)}">${inv.PaymentStatus}</span></td>
        <td>
          ${inv.PaymentStatus !== 'Paid'
            ? `<button class="btn btn-success btn-sm" onclick="openPaymentDirect(${inv.InvoiceID}, ${inv.TotalAmount})">💳 Pay</button>`
            : '<span style="color:var(--success); font-size:0.82rem;">✅ Paid</span>'}
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load invoices.', 'danger'); }
}

function clearInvFilters() {
  document.getElementById('inv-search').value = '';
  document.getElementById('inv-status').value = '';
  document.getElementById('inv-type').value   = '';
  loadInvoices();
}

function openPaymentDirect(invoiceId, total) {
  selectedInvoiceId = invoiceId;
  document.getElementById('payment-info').innerHTML = `<div style="display:flex; justify-content:space-between;"><span>Invoice #${invoiceId}</span><strong>Total: $${total}</strong></div>`;
  document.getElementById('payment-amount').value   = total;
  document.getElementById('payment-alert').innerHTML = '';
  openModal('modal-payment');
}

async function confirmPayment() {
  const amount = parseFloat(document.getElementById('payment-amount').value);
  if (!amount || amount <= 0)
    return document.getElementById('payment-alert').innerHTML = '<div class="alert alert-danger">Enter a valid amount.</div>';
  try {
    const res  = await fetch(`${API}/invoices/${selectedInvoiceId}/pay`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ AmountPaid: amount }) });
    const data = await res.json();
    if (!res.ok) return document.getElementById('payment-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-payment');
    showAlert(`Payment recorded. Status: ${data.PaymentStatus} ✅`, 'success');
    loadInvoices(); loadDashboard();
  } catch { showAlert('Error recording payment.', 'danger'); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS (All roles — filtered by role)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadReports() {
  const from = document.getElementById('rpt-from').value || new Date(new Date().setDate(1)).toISOString().slice(0,10);
  const to   = document.getElementById('rpt-to').value   || new Date().toISOString().slice(0,10);
  document.getElementById('reports-content').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const [occRes, revRes, fbRes] = await Promise.all([
      fetch(`${API}/reports/occupancy?from=${from}&to=${to}`, { headers: authHeaders() }),
      mgrRole === ROLE.FINANCE || mgrRole === ROLE.ADMIN
        ? fetch(`${API}/reports/revenue`, { headers: authHeaders() })
        : Promise.resolve({ ok: false }),
      fetch(`${API}/reports/feedback-summary`, { headers: authHeaders() })
    ]);
    const occ = await occRes.json();
    const rev = revRes.ok ? await revRes.json() : null;
    const fb  = await fbRes.json();
    const maxRev = rev ? Math.max(...(rev.monthly || []).map(m => parseFloat(m.Total) || 0), 1) : 1;
    let html = `
      <div class="report-grid" style="margin-bottom:1.5rem;">
        <div class="report-card">
          <h3>🛏 Occupancy by Category (${from} – ${to})</h3>
          ${occ.byCategory?.length ? occ.byCategory.map(c => `
            <div style="display:flex; justify-content:space-between; padding:0.4rem 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
              <span>${c.CategoryName}</span>
              <span><strong>${c.Bookings}</strong> bookings · <strong>$${parseFloat(c.Revenue).toLocaleString()}</strong></span>
            </div>
          `).join('') : '<div class="empty-state" style="padding:1rem;">No data for period.</div>'}
        </div>
        <div class="report-card">
          <h3>⭐ Feedback Summary</h3>
          <div style="text-align:center; margin-bottom:0.75rem;">
            <div style="font-size:2.5rem; font-weight:800; color:var(--accent);">${fb.AvgRating || '—'}</div>
            <div style="color:var(--text-muted); font-size:0.85rem;">Average Rating (${fb.Total || 0} reviews)</div>
          </div>
          <div style="display:flex; justify-content:space-around; font-size:0.82rem;">
            <div style="text-align:center;"><div style="font-weight:700; color:var(--success);">${fb.Excellent||0}</div><div style="color:var(--text-muted);">Excellent</div></div>
            <div style="text-align:center;"><div style="font-weight:700; color:#16a34a;">${fb.Good||0}</div><div style="color:var(--text-muted);">Good</div></div>
            <div style="text-align:center;"><div style="font-weight:700; color:var(--warning);">${fb.Average||0}</div><div style="color:var(--text-muted);">Average</div></div>
            <div style="text-align:center;"><div style="font-weight:700; color:var(--danger);">${fb.Poor||0}</div><div style="color:var(--text-muted);">Poor</div></div>
          </div>
        </div>
      </div>
    `;
    if (rev) {
      html += `
        <div class="table-wrap" style="margin-bottom:1.5rem;">
          <div class="table-header">
            <h3>📊 Monthly Revenue (Last 12 Months)</h3>
            <div style="font-size:0.82rem; color:var(--text-muted);">
              Paid: <strong style="color:var(--success);">$${parseFloat(rev.totals?.TotalPaid||0).toLocaleString()}</strong> &nbsp;
              Unpaid: <strong style="color:var(--danger);">$${parseFloat(rev.totals?.TotalUnpaid||0).toLocaleString()}</strong>
            </div>
          </div>
          <div style="padding:1.25rem;">
            <div class="chart-bar-wrap">
              ${(rev.monthly || []).map(m => `
                <div class="chart-bar-row">
                  <div class="chart-bar-label">${m.Month}</div>
                  <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${Math.round((parseFloat(m.Total)/maxRev)*100)}%">
                      <span>$${parseFloat(m.Total).toLocaleString()}</span>
                    </div>
                  </div>
                  <div class="chart-bar-val">$${parseFloat(m.Total).toLocaleString()}</div>
                </div>
              `).join('') || '<div class="empty-state">No revenue data.</div>'}
            </div>
          </div>
        </div>
      `;
    }
    if (mgrRole !== ROLE.FINANCE && occ.overdue?.length) {
      html += `
        <div class="table-wrap">
          <div class="table-header"><h3>⚠️ Overdue Check-Outs</h3></div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Reference</th><th>Guest</th><th>Room</th><th>Scheduled Check-Out</th><th>Hours Overdue</th><th>Payment</th></tr></thead>
              <tbody>
                ${occ.overdue.map(r => `
                  <tr>
                    <td style="font-family:monospace;">${r.BookingReference}</td>
                    <td>${r.GuestName}<div style="font-size:0.75rem; color:var(--text-muted);">${r.ContactNumber}</div></td>
                    <td>${r.RoomNumber}</td>
                    <td>${fmtDateTime(r.CheckOutDate)}</td>
                    <td><span class="badge badge-danger">${r.HoursOverdue}h overdue</span></td>
                    <td><span class="badge ${payBadge(r.PaymentStatus)}">${r.PaymentStatus || '—'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    document.getElementById('reports-content').innerHTML = html;
  } catch { document.getElementById('reports-content').innerHTML = '<div class="alert alert-danger">Failed to load reports.</div>'; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK (All roles)
// ═══════════════════════════════════════════════════════════════════════════════
async function loadFeedback() {
  const params = new URLSearchParams();
  const rating = document.getElementById('fb-rating-filter')?.value;
  const type   = document.getElementById('fb-type-filter')?.value;
  if (rating) params.set('rating', rating);
  if (type)   params.set('type', type);
  try {
    const [fbRes, sumRes] = await Promise.all([
      fetch(`${API}/feedback?${params}`, { headers: authHeaders() }),
      fetch(`${API}/reports/feedback-summary`, { headers: authHeaders() })
    ]);
    const data    = await fbRes.json();
    const summary = await sumRes.json();
    document.getElementById('feedback-summary-bar').innerHTML = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap;">
        <div class="stat-card" style="--stat-color:var(--accent); flex:1; min-width:120px; padding:1rem;">
          <div class="stat-label">Avg Rating</div><div class="stat-value">${summary.AvgRating || '—'} ⭐</div>
          <div class="stat-sub">${summary.Total || 0} total reviews</div>
        </div>
        <div class="stat-card" style="--stat-color:var(--success); flex:1; min-width:100px; padding:1rem;"><div class="stat-label">Excellent</div><div class="stat-value">${summary.Excellent || 0}</div></div>
        <div class="stat-card" style="--stat-color:#16a34a; flex:1; min-width:100px; padding:1rem;"><div class="stat-label">Good</div><div class="stat-value">${summary.Good || 0}</div></div>
        <div class="stat-card" style="--stat-color:var(--warning); flex:1; min-width:100px; padding:1rem;"><div class="stat-label">Average</div><div class="stat-value">${summary.Average || 0}</div></div>
        <div class="stat-card" style="--stat-color:var(--danger); flex:1; min-width:100px; padding:1rem;"><div class="stat-label">Poor</div><div class="stat-value">${summary.Poor || 0}</div></div>
      </div>
    `;
    const tbody = document.getElementById('feedback-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No feedback found.</td></tr>'; return; }
    tbody.innerHTML = data.map(f => `
      <tr>
        <td>${f.FeedbackID}</td>
        <td><div style="font-weight:600;">${f.CustomerName}</div><div style="font-size:0.75rem; color:var(--text-muted);">${f.Email}</div></td>
        <td><span class="badge badge-muted">${f.FeedbackType}</span></td>
        <td style="font-family:monospace; font-size:0.78rem;">${f.Reference}</td>
        <td><span style="color:var(--accent);">${'⭐'.repeat(f.Rating)}</span> <span style="color:var(--text-muted); font-size:0.78rem;">(${f.Rating}/5)</span></td>
        <td style="max-width:250px; font-size:0.83rem; font-style:italic; color:var(--text-muted);">${f.Comments ? `"${f.Comments}"` : '—'}</td>
        <td style="font-size:0.78rem;">${fmtDate(f.SubmittedDate)}</td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load feedback.', 'danger'); }
}