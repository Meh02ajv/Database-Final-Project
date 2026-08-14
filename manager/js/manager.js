// ===== GRAND HORIZON HOTEL — MANAGER PORTAL =====
const API = '/api';
let mgrToken = null;
let selectedRoomNum = null;
let selectedInvoiceId = null;
let selectedEventId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const token = sessionStorage.getItem('mgr_token');
  if (token) { mgrToken = token; showDashboard(); }
});

// ===== AUTH =====
async function doManagerLogin() {
  const email = document.getElementById('mgr-username').value.trim();
  const password = document.getElementById('mgr-password').value;
  if (!email || !password) return showLoginAlert('Please enter credentials.', 'danger');
  try {
    const res = await fetch(`${API}/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: email, Password: password })
    });
    const data = await res.json();
    if (!res.ok) return showLoginAlert(data.error, 'danger');
    mgrToken = data.token;
    sessionStorage.setItem('mgr_token', mgrToken);
    sessionStorage.setItem('mgr_role', data.role);
    sessionStorage.setItem('mgr_name', data.FirstName);
    showDashboard();
  } catch { showLoginAlert('Connection error. Is the server running?', 'danger'); }
}

function showLoginAlert(msg, type) {
  document.getElementById('login-alert').innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';
  loadDashboard();
  loadTodayActivity();
}

function doLogout() {
  sessionStorage.removeItem('mgr_token');
  mgrToken = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

// ===== NAVIGATION =====
function showSection(id, navEl) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(id).style.display = 'block';
  if (navEl) navEl.classList.add('active');
  const titles = {
    'dashboard-home': 'Dashboard', 'section-rooms': 'Room Management',
    'section-reservations': 'Reservations', 'section-events': 'Event Bookings',
    'section-invoices': 'Invoice Management', 'section-reports': 'Reports & Analytics',
    'section-feedback': 'Customer Feedback'
  };
  document.getElementById('topbar-title').textContent = titles[id] || '';
  // Lazy load
  if (id === 'section-rooms') loadRooms();
  if (id === 'section-reservations') loadReservations();
  if (id === 'section-events') loadEvents();
  if (id === 'section-invoices') loadInvoices();
  if (id === 'section-reports') loadReports();
  if (id === 'section-feedback') loadFeedback();
}

function switchTab(tabId, btn) {
  const parent = btn.closest('.section') || document.getElementById('section-rooms');
  parent.querySelectorAll('[id$="-view"]').forEach(t => t.style.display = 'none');
  parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ===== ALERTS =====
function showAlert(msg, type = 'info') {
  const el = document.getElementById('global-alert');
  const msgEl = document.getElementById('global-alert-msg');
  msgEl.className = `alert alert-${type}`;
  msgEl.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ===== HELPERS =====
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${mgrToken}` });
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function statusBadge(s) {
  return {
    'Confirmed': 'badge-info', 'Checked-In': 'badge-success', 'Checked-Out': 'badge-muted',
    'Cancelled': 'badge-danger', 'Completed': 'badge-success', 'In Progress': 'badge-warning',
    'Available': 'badge-success', 'Reserved': 'badge-info', 'Occupied': 'badge-warning',
    'Under Maintenance': 'badge-danger'
  }[s] || 'badge-muted';
}
function payBadge(s) {
  return { 'Paid': 'badge-success', 'Unpaid': 'badge-danger', 'Partially Paid': 'badge-warning' }[s] || 'badge-muted';
}
function roomTileColor(s) {
  return { 'Available': '#16a34a', 'Reserved': '#2563eb', 'Occupied': '#d97706', 'Under Maintenance': '#dc2626' }[s] || '#6b7280';
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/reports/dashboard`, { headers: authHeaders() });
    const d = await res.json();
    const { occupancy, guests, todayActivity, revenue, upcomingEvents, customers } = d;
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card" style="--stat-color:#16a34a;">
        <div class="stat-label">Available Rooms</div>
        <div class="stat-value">${occupancy.Available}</div>
        <div class="stat-sub">of ${occupancy.TotalRooms} total rooms</div>
      </div>
      <div class="stat-card" style="--stat-color:#2563eb;">
        <div class="stat-label">Reserved</div>
        <div class="stat-value">${occupancy.Reserved}</div>
        <div class="stat-sub">rooms confirmed</div>
      </div>
      <div class="stat-card" style="--stat-color:#d97706;">
        <div class="stat-label">Occupied</div>
        <div class="stat-value">${occupancy.Occupied}</div>
        <div class="stat-sub">${guests.TotalOccupants || 0} guests in-house</div>
      </div>
      <div class="stat-card" style="--stat-color:#dc2626;">
        <div class="stat-label">Maintenance</div>
        <div class="stat-value">${occupancy.UnderMaintenance}</div>
        <div class="stat-sub">rooms unavailable</div>
      </div>
      <div class="stat-card" style="--stat-color:#7c3aed;">
        <div class="stat-label">Today Check-Ins</div>
        <div class="stat-value">${todayActivity.TodayCheckIns || 0}</div>
        <div class="stat-sub">expected arrivals</div>
      </div>
      <div class="stat-card" style="--stat-color:#0891b2;">
        <div class="stat-label">Today Check-Outs</div>
        <div class="stat-value">${todayActivity.TodayCheckOuts || 0}</div>
        <div class="stat-sub">expected departures</div>
      </div>
      <div class="stat-card" style="--stat-color:#c9a84c;">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value" style="font-size:1.5rem;">$${parseFloat(revenue.TotalRevenue).toLocaleString()}</div>
        <div class="stat-sub">$${parseFloat(revenue.OutstandingBalance).toLocaleString()} outstanding</div>
      </div>
      <div class="stat-card" style="--stat-color:#1a3c5e;">
        <div class="stat-label">Upcoming Events</div>
        <div class="stat-value">${upcomingEvents.UpcomingEvents}</div>
        <div class="stat-sub">${customers.TotalCustomers} registered customers</div>
      </div>
    `;
  } catch (e) {
    document.getElementById('stats-grid').innerHTML = '<div class="alert alert-danger">Failed to load dashboard. Is the server running?</div>';
  }
}

async function loadTodayActivity() {
  try {
    const res = await fetch(`${API}/reservations?date=${new Date().toISOString().slice(0, 10)}`, { headers: authHeaders() });
    const data = await res.json();
    const checkIns = data.filter(r => new Date(r.CheckInDate).toDateString() === new Date().toDateString());
    const checkOuts = data.filter(r => new Date(r.CheckOutDate).toDateString() === new Date().toDateString());
    const renderList = (items, type) => items.length ? items.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
        <div>
          <div style="font-weight:600;">${r.GuestName}</div>
          <div style="color:var(--text-muted);">Room ${r.RoomNumber} · ${r.BookingReference}</div>
        </div>
        <span class="badge ${statusBadge(r.Status)}">${r.Status}</span>
      </div>
    `).join('') : '<div class="empty-state" style="padding: 0;">No activity today</div>';
    document.getElementById('today-checkins').innerHTML = renderList(checkIns, 'in');
    document.getElementById('today-checkouts').innerHTML = renderList(checkOuts, 'out');
  } catch { }
}

// ===== ROOMS =====
async function loadRooms() {
  const statusFilter = document.getElementById('room-status-filter')?.value || '';
  try {
    const res = await fetch(`${API}/rooms/all`, { headers: authHeaders() });
    const rooms = await res.json();
    const filtered = statusFilter ? rooms.filter(r => r.Status === statusFilter) : rooms;

    // Grid view
    document.getElementById('room-grid-container').innerHTML = filtered.map(r => `
      <div class="room-tile" style="--tile-color:${roomTileColor(r.Status)};">
        <div class="room-num">${r.RoomNumber}</div>
        <div class="room-cat">${r.CategoryName}</div>
        <div class="room-status">${r.Status}</div>
        <div style="margin-top:0.5rem;">
          <button class="btn btn-outline btn-sm" style="font-size:0.68rem; padding: 0;" onclick="openRoomStatus('${r.RoomNumber}', '${r.Status}')">Edit</button>
        </div>
      </div>
    `).join('');

    // Table view
    document.getElementById('rooms-table-body').innerHTML = filtered.map(r => `
      <tr>
        <td><strong>${r.RoomNumber}</strong></td>
        <td>${r.CategoryName}</td>
        <td>${r.Floor}</td>
        <td>${r.MaxOccupants}</td>
        <td>$${r.PricePerNight}</td>
        <td><span class="badge ${statusBadge(r.Status)}">${r.Status}</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="openRoomStatus('${r.RoomNumber}', '${r.Status}')">✏️ Status</button></td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load rooms.', 'danger'); }
}

function openRoomStatus(roomNum, currentStatus) {
  selectedRoomNum = roomNum;
  document.getElementById('room-status-info').textContent = `Room ${roomNum} — Current status: ${currentStatus}`;
  document.getElementById('new-room-status').value = currentStatus;
  document.getElementById('room-status-alert').innerHTML = '';
  openModal('modal-room-status');
}

async function confirmRoomStatus() {
  const status = document.getElementById('new-room-status').value;
  try {
    const res = await fetch(`${API}/rooms/${selectedRoomNum}/status`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) return document.getElementById('room-status-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-room-status');
    showAlert(`Room ${selectedRoomNum} updated to ${status}.`, 'success');
    loadRooms();
  } catch { showAlert('Error updating room.', 'danger'); }
}

// ===== RESERVATIONS =====
async function loadReservations() {
  const params = new URLSearchParams();
  const search = document.getElementById('res-search')?.value;
  const status = document.getElementById('res-status')?.value;
  const date = document.getElementById('res-date')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (date) params.set('date', date);
  try {
    const res = await fetch(`${API}/reservations?${params}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('reservations-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No reservations found.</td></tr>'; return; }
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${r.ReservationID}</td>
        <td style="font-family:monospace; font-size:0.8rem;">${r.BookingReference}</td>
        <td>
          <div style="font-weight:600;">${r.GuestName}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${r.ContactNumber}</div>
        </td>
        <td>${r.RoomNumber} <span style="color:var(--text-muted); font-size:0.78rem;">${r.CategoryName}</span></td>
        <td>${fmtDate(r.CheckInDate)}</td>
        <td>${fmtDate(r.CheckOutDate)}</td>
        <td>${r.NumOccupants}</td>
        <td><span class="badge ${statusBadge(r.Status)}">${r.Status}</span></td>
        <td>
          ${r.TotalAmount ? `<div>$${r.TotalAmount}</div><span class="badge ${payBadge(r.PaymentStatus)}">${r.PaymentStatus}</span>` : '—'}
        </td>
        <td>
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
            ${r.Status === 'Confirmed' ? `<button class="btn btn-success btn-sm" onclick="checkIn(${r.ReservationID})">Check-In</button>` : ''}
            ${r.Status === 'Checked-In' ? `<button class="btn btn-warning btn-sm" onclick="checkOut(${r.ReservationID})">Check-Out</button>` : ''}
            ${r.PaymentStatus && r.PaymentStatus !== 'Paid' ? `<button class="btn btn-primary btn-sm" onclick="openPayment(${r.InvoiceID || 0}, r.TotalAmount, r.PaymentStatus)">💳 Pay</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load reservations.', 'danger'); }
}

function clearResFilters() {
  ['res-search', 'res-date'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('res-status').value = '';
  loadReservations();
}

async function checkIn(id) {
  if (!confirm('Check in this guest?')) return;
  try {
    const res = await fetch(`${API}/reservations/${id}/checkin`, { method: 'PUT', headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Guest checked in successfully! ✅', 'success');
    loadReservations(); loadDashboard();
  } catch { showAlert('Error during check-in.', 'danger'); }
}

async function checkOut(id) {
  const fee = parseFloat(prompt('Late check-out fee (enter 0 if none):', '0') || '0');
  try {
    const res = await fetch(`${API}/reservations/${id}/checkout`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ lateCheckoutFee: fee })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Guest checked out successfully! ✅', 'success');
    loadReservations(); loadDashboard();
  } catch { showAlert('Error during check-out.', 'danger'); }
}

// ===== EVENTS =====
async function loadEvents() {
  const params = new URLSearchParams();
  const search = document.getElementById('evt-search')?.value;
  const status = document.getElementById('evt-status')?.value;
  const date = document.getElementById('evt-date')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (date) params.set('date', date);
  try {
    const res = await fetch(`${API}/events?${params}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('events-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No events found.</td></tr>'; return; }
    tbody.innerHTML = data.map(e => `
      <tr>
        <td>${e.EventID}</td>
        <td>
          <div style="font-weight:600;">${e.CustomerName}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${e.ContactNumber}</div>
        </td>
        <td>${e.HallName}</td>
        <td>${e.EventType}</td>
        <td>${fmtDate(e.EventDate)}</td>
        <td style="font-size:0.82rem;">${e.StartTime} – ${e.EndTime}</td>
        <td>${e.ExpectedAttendees}</td>
        <td><span class="badge ${statusBadge(e.Status)}">${e.Status}</span></td>
        <td>
          ${e.TotalAmount ? `<div>$${e.TotalAmount}</div><span class="badge ${payBadge(e.PaymentStatus)}">${e.PaymentStatus}</span>` : '—'}
        </td>
        <td>
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="openEventStatus(${e.EventID}, '${e.Status}', '${e.EventType}')">✏️ Status</button>
            ${e.PaymentStatus && e.PaymentStatus !== 'Paid' ? `<button class="btn btn-primary btn-sm" onclick="openPaymentDirect(${e.InvoiceID || 0}, ${e.TotalAmount})">💳 Pay</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load events.', 'danger'); }
}

function clearEvtFilters() {
  ['evt-search', 'evt-date'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('evt-status').value = '';
  loadEvents();
}

function openEventStatus(eventId, currentStatus, eventType) {
  selectedEventId = eventId;
  document.getElementById('event-status-info').textContent = `Event #${eventId}: ${eventType} — Current: ${currentStatus}`;
  document.getElementById('new-event-status').value = currentStatus;
  document.getElementById('event-status-alert').innerHTML = '';
  openModal('modal-event-status');
}

async function confirmEventStatus() {
  const status = document.getElementById('new-event-status').value;
  try {
    const res = await fetch(`${API}/events/${selectedEventId}/status`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) return document.getElementById('event-status-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-event-status');
    showAlert(`Event status updated to ${status}.`, 'success');
    loadEvents();
  } catch { showAlert('Error updating event.', 'danger'); }
}

// ===== INVOICES =====
async function loadInvoices() {
  const params = new URLSearchParams();
  const search = document.getElementById('inv-search')?.value;
  const status = document.getElementById('inv-status')?.value;
  const type = document.getElementById('inv-type')?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  try {
    const res = await fetch(`${API}/invoices?${params}`, { headers: authHeaders() });
    const data = await res.json();
    const tbody = document.getElementById('invoices-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No invoices found.</td></tr>'; return; }
    tbody.innerHTML = data.map(inv => `
      <tr>
        <td><strong>#${inv.InvoiceID}</strong></td>
        <td>${inv.CustomerName || '—'}</td>
        <td><span class="badge badge-muted" style="font-size:0.7rem;">${inv.InvoiceType}</span></td>
        <td style="font-family:monospace; font-size:0.8rem;">${inv.Reference}</td>
        <td>$${inv.RoomCharges}</td>
        <td>$${inv.EventCharges}</td>
        <td>$${inv.AdditionalCharges}</td>
        <td><strong>$${inv.TotalAmount}</strong></td>
        <td><span class="badge ${payBadge(inv.PaymentStatus)}">${inv.PaymentStatus}</span></td>
        <td>
          ${inv.PaymentStatus !== 'Paid' ? `<button class="btn btn-success btn-sm" onclick="openPaymentDirect(${inv.InvoiceID}, ${inv.TotalAmount})">💳 Pay</button>` : '<span style="color:var(--success); font-size:0.82rem;">✅ Paid</span>'}
        </td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load invoices.', 'danger'); }
}

function clearInvFilters() {
  document.getElementById('inv-search').value = '';
  document.getElementById('inv-status').value = '';
  document.getElementById('inv-type').value = '';
  loadInvoices();
}

function openPaymentDirect(invoiceId, total) {
  selectedInvoiceId = invoiceId;
  document.getElementById('payment-info').innerHTML = `
    <div style="display:flex; justify-content:space-between;">
      <span>Invoice #${invoiceId}</span>
      <strong>Total: $${total}</strong>
    </div>
  `;
  document.getElementById('payment-amount').value = total;
  document.getElementById('payment-alert').innerHTML = '';
  openModal('modal-payment');
}

function openPayment(invoiceId, total, status) { openPaymentDirect(invoiceId, total); }

async function confirmPayment() {
  const amount = parseFloat(document.getElementById('payment-amount').value);
  if (!amount || amount <= 0) return document.getElementById('payment-alert').innerHTML = '<div class="alert alert-danger">Enter a valid amount.</div>';
  try {
    const res = await fetch(`${API}/invoices/${selectedInvoiceId}/pay`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ AmountPaid: amount })
    });
    const data = await res.json();
    if (!res.ok) return document.getElementById('payment-alert').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
    closeModal('modal-payment');
    showAlert(`Payment recorded. Status: ${data.PaymentStatus} ✅`, 'success');
    loadInvoices(); loadDashboard();
  } catch { showAlert('Error recording payment.', 'danger'); }
}

// ===== REPORTS =====
async function loadReports() {
  const from = document.getElementById('rpt-from').value || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
  const to = document.getElementById('rpt-to').value || new Date().toISOString().slice(0, 10);
  document.getElementById('reports-content').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const [occRes, revRes, fbRes] = await Promise.all([
      fetch(`${API}/reports/occupancy?from=${from}&to=${to}`, { headers: authHeaders() }),
      fetch(`${API}/reports/revenue`, { headers: authHeaders() }),
      fetch(`${API}/reports/feedback-summary`, { headers: authHeaders() })
    ]);
    const occ = await occRes.json();
    const rev = await revRes.json();
    const fb = await fbRes.json();
    const maxRev = Math.max(...(rev.monthly || []).map(m => parseFloat(m.Total) || 0), 1);
    document.getElementById('reports-content').innerHTML = `
      <!-- Revenue Summary -->
      <div class="report-grid" style="margin-bottom:1.5rem;">
        <div class="report-card">
          <h3>💰 Revenue Summary</h3>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <div style="display:flex; justify-content:space-between; padding: 0; border-bottom:1px solid var(--border);">
              <span style="color:var(--text-muted);">Total Paid</span>
              <strong style="color:var(--success);">$${parseFloat(rev.totals?.TotalPaid || 0).toLocaleString()}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 0; border-bottom:1px solid var(--border);">
              <span style="color:var(--text-muted);">Outstanding</span>
              <strong style="color:var(--danger);">$${parseFloat(rev.totals?.TotalUnpaid || 0).toLocaleString()}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 0;">
              <span style="color:var(--text-muted);">Partially Paid</span>
              <strong style="color:var(--warning);">$${parseFloat(rev.totals?.TotalPartial || 0).toLocaleString()}</strong>
            </div>
          </div>
        </div>
        <div class="report-card">
          <h3>⭐ Feedback Summary</h3>
          <div style="text-align:center; margin-bottom:0.75rem;">
            <div style="font-size:2.5rem; font-weight:800; color:var(--accent);">${fb.AvgRating || '—'}</div>
            <div style="color:var(--text-muted); font-size:0.85rem;">Average Rating (${fb.Total || 0} reviews)</div>
          </div>
          <div style="display:flex; justify-content:space-around; font-size:0.82rem;">
            <div style="text-align:center;"><div style="font-weight:700; color:var(--success);">${fb.Excellent || 0}</div><div style="color:var(--text-muted);">Excellent</div></div>
            <div style="text-align:center;"><div style="font-weight:700; color:#16a34a;">${fb.Good || 0}</div><div style="color:var(--text-muted);">Good</div></div>
            <div style="text-align:center;"><div style="font-weight:700; color:var(--warning);">${fb.Average || 0}</div><div style="color:var(--text-muted);">Average</div></div>
            <div style="text-align:center;"><div style="font-weight:700; color:var(--danger);">${fb.Poor || 0}</div><div style="color:var(--text-muted);">Poor</div></div>
          </div>
        </div>
        <div class="report-card">
          <h3>🛏 Occupancy by Category (${from} – ${to})</h3>
          ${occ.byCategory?.length ? occ.byCategory.map(c => `
            <div style="display:flex; justify-content:space-between; padding: 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
              <span>${c.CategoryName}</span>
              <span><strong>${c.Bookings}</strong> bookings · <strong>$${parseFloat(c.Revenue).toLocaleString()}</strong></span>
            </div>
          `).join('') : '<div class="empty-state" style="padding: 0;">No data for period.</div>'}
        </div>
      </div>
      <!-- Monthly Revenue Chart -->
      <div class="table-wrap" style="margin-bottom:1.5rem;">
        <div class="table-header"><h3>📊 Monthly Revenue (Last 12 Months)</h3></div>
        <div style="padding: 0;">
          <div class="chart-bar-wrap">
            ${(rev.monthly || []).map(m => `
              <div class="chart-bar-row">
                <div class="chart-bar-label">${m.Month}</div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width:${Math.round((parseFloat(m.Total) / maxRev) * 100)}%">
                    <span>$${parseFloat(m.Total).toLocaleString()}</span>
                  </div>
                </div>
                <div class="chart-bar-val">$${parseFloat(m.Total).toLocaleString()}</div>
              </div>
            `).join('') || '<div class="empty-state">No revenue data.</div>'}
          </div>
        </div>
      </div>
      <!-- Overdue Checkouts -->
      ${occ.overdue?.length ? `
        <div class="table-wrap">
          <div class="table-header"><h3>⚠️ Overdue Check-Outs</h3></div>
          <div style="overflow-x:auto;">
            <table>
              <thead><tr><th>Ref</th><th>Guest</th><th>Room</th><th>Scheduled Check-Out</th><th>Hours Overdue</th><th>Payment</th></tr></thead>
              <tbody>
                ${occ.overdue.map(r => `
                  <tr>
                    <td style="font-family:monospace;">${r.BookingReference}</td>
                    <td>${r.GuestName} <div style="font-size:0.78rem; color:var(--text-muted);">${r.ContactNumber}</div></td>
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
      ` : ''}
    `;
  } catch { document.getElementById('reports-content').innerHTML = '<div class="alert alert-danger">Failed to load reports.</div>'; }
}

// ===== FEEDBACK =====
async function loadFeedback() {
  const params = new URLSearchParams();
  const rating = document.getElementById('fb-rating-filter')?.value;
  const type = document.getElementById('fb-type-filter')?.value;
  if (rating) params.set('rating', rating);
  if (type) params.set('type', type);
  try {
    const [fbRes, sumRes] = await Promise.all([
      fetch(`${API}/feedback?${params}`, { headers: authHeaders() }),
      fetch(`${API}/reports/feedback-summary`, { headers: authHeaders() })
    ]);
    const data = await fbRes.json();
    const summary = await sumRes.json();
    document.getElementById('feedback-summary-bar').innerHTML = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap;">
        <div class="stat-card" style="--stat-color:var(--accent); flex:1; min-width:120px; padding: 0;">
          <div class="stat-label">Avg Rating</div>
          <div class="stat-value">${summary.AvgRating || '—'} ⭐</div>
          <div class="stat-sub">${summary.Total || 0} total reviews</div>
        </div>
        <div class="stat-card" style="--stat-color:var(--success); flex:1; min-width:100px; padding: 0;">
          <div class="stat-label">Excellent</div>
          <div class="stat-value">${summary.Excellent || 0}</div>
        </div>
        <div class="stat-card" style="--stat-color:#16a34a; flex:1; min-width:100px; padding: 0;">
          <div class="stat-label">Good</div>
          <div class="stat-value">${summary.Good || 0}</div>
        </div>
        <div class="stat-card" style="--stat-color:var(--warning); flex:1; min-width:100px; padding: 0;">
          <div class="stat-label">Average</div>
          <div class="stat-value">${summary.Average || 0}</div>
        </div>
        <div class="stat-card" style="--stat-color:var(--danger); flex:1; min-width:100px; padding: 0;">
          <div class="stat-label">Poor</div>
          <div class="stat-value">${summary.Poor || 0}</div>
        </div>
      </div>
    `;
    const tbody = document.getElementById('feedback-table-body');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No feedback found.</td></tr>'; return; }
    tbody.innerHTML = data.map(f => `
      <tr>
        <td>${f.FeedbackID}</td>
        <td>
          <div style="font-weight:600;">${f.CustomerName}</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${f.Email}</div>
        </td>
        <td><span class="badge badge-muted">${f.FeedbackType}</span></td>
        <td style="font-family:monospace; font-size:0.8rem;">${f.Reference}</td>
        <td><span style="color:var(--accent);">${'⭐'.repeat(f.Rating)}</span> <span style="color:var(--text-muted); font-size:0.8rem;">(${f.Rating}/5)</span></td>
        <td style="max-width:250px; font-size:0.85rem; font-style:italic; color:var(--text-muted);">${f.Comments ? `"${f.Comments}"` : '—'}</td>
        <td style="font-size:0.8rem;">${fmtDate(f.SubmittedDate)}</td>
      </tr>
    `).join('');
  } catch { showAlert('Failed to load feedback.', 'danger'); }
}
