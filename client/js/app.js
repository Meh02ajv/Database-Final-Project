//===== GRAND HORIZON HOTEL — CLIENT APP =====
const API = '/api';
let currentUser = null;
let selectedRoom = null;
let selectedHall = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setMinDates();
  loadCategories();
  loadRooms();
  loadHalls();
  restoreSession();
});

function setMinDates() {
  const today = new Date().toISOString().slice(0, 10);
  ['home-checkin','home-checkout','r-checkin','r-checkout','e-date','book-checkin','book-checkout','event-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.min = today;
  });
}

function restoreSession() {
  const token = localStorage.getItem('gh_token');
  const user = localStorage.getItem('gh_user');
  if (token && user) {
    currentUser = JSON.parse(user);
    updateNavForUser();
  }
}

// ===== NAVIGATION =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  if (page === 'bookings') { loadMyReservations(); loadMyEvents(); loadMyFeedback(); }
  if (page === 'invoices') loadMyInvoices();
  if (page === 'rooms') loadRooms();
  if (page === 'events') loadHalls();
}

function updateNavForUser() {
  if (currentUser) {
    document.getElementById('nav-user').textContent = `👤 ${currentUser.FirstName}`;
    document.getElementById('btn-logout').style.display = 'inline-flex';
    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('btn-register').style.display = 'none';
    document.getElementById('nav-bookings').style.display = 'inline';
    document.getElementById('nav-invoices').style.display = 'inline';
  } else {
    document.getElementById('nav-user').textContent = '';
    document.getElementById('btn-logout').style.display = 'none';
    document.getElementById('btn-login').style.display = 'inline-flex';
    document.getElementById('btn-register').style.display = 'inline-flex';
    document.getElementById('nav-bookings').style.display = 'none';
    document.getElementById('nav-invoices').style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('gh_token');
  localStorage.removeItem('gh_user');
  currentUser = null;
  updateNavForUser();
  showPage('home');
  showAlert('You have been logged out.', 'info');
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ===== ALERTS =====
function showAlert(msg, type = 'info', containerId = null) {
  const html = `<div class="alert alert-${type}">${msg}</div>`;
  if (containerId) {
    document.getElementById(containerId).innerHTML = html;
  } else {
    const el = document.getElementById('global-alert');
    document.getElementById('global-alert-msg').className = `alert alert-${type}`;
    document.getElementById('global-alert-msg').textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

// ===== AUTH =====
async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAlert('Please fill in all fields.', 'danger', 'login-alert');
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: email, Password: password })
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger', 'login-alert');
    localStorage.setItem('gh_token', data.token);
    localStorage.setItem('gh_user', JSON.stringify(data));
    currentUser = data;
    updateNavForUser();
    closeModal('modal-login');
    showAlert(`Welcome back, ${data.FirstName}! 🎉`, 'success');
  } catch { showAlert('Connection error. Please try again.', 'danger', 'login-alert'); }
}

async function doRegister() {
  const body = {
    FirstName: document.getElementById('reg-firstname').value.trim(),
    LastName: document.getElementById('reg-lastname').value.trim(),
    Email: document.getElementById('reg-email').value.trim(),
    ContactNumber: document.getElementById('reg-contact').value.trim(),
    Password: document.getElementById('reg-password').value
  };
  if (!body.FirstName || !body.LastName || !body.Email || !body.Password)
    return showAlert('Please fill in all required fields.', 'danger', 'register-alert');
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error || data.errors?.[0]?.msg, 'danger', 'register-alert');
    localStorage.setItem('gh_token', data.token);
    localStorage.setItem('gh_user', JSON.stringify(data));
    currentUser = data;
    updateNavForUser();
    closeModal('modal-register');
    showAlert(`Account created! Welcome, ${data.FirstName}! 🎉`, 'success');
  } catch { showAlert('Connection error. Please try again.', 'danger', 'register-alert'); }
}

// ===== CATEGORIES =====
async function loadCategories() {
  try {
    const res = await fetch(`${API}/rooms/categories`);
    const cats = await res.json();
    ['home-category', 'r-category'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.CategoryName;
        opt.textContent = `${c.CategoryName} — $${c.PricePerNight}/night`;
        sel.appendChild(opt);
      });
    });
  } catch {}
}

// ===== ROOMS =====
async function loadRooms() {
  const container = document.getElementById('rooms-list');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading rooms...</p></div>';
  const params = new URLSearchParams();
  const ci = document.getElementById('r-checkin')?.value;
  const co = document.getElementById('r-checkout')?.value;
  const cat = document.getElementById('r-category')?.value;
  const min = document.getElementById('r-minprice')?.value;
  const max = document.getElementById('r-maxprice')?.value;
  const occ = document.getElementById('r-occupants')?.value;
  if (ci) params.set('checkIn', ci);
  if (co) params.set('checkOut', co);
  if (cat) params.set('category', cat);
  if (min) params.set('minPrice', min);
  if (max) params.set('maxPrice', max);
  if (occ) params.set('occupants', occ);
  try {
    const res = await fetch(`${API}/rooms?${params}`);
    const rooms = await res.json();
    if (!rooms.length) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🛏</div><p>No rooms match your search. Try adjusting your filters.</p></div>';
      return;
    }
    container.innerHTML = rooms.map(r => `
      <div class="card">
        <div class="card-header">
          <h3>Room ${r.RoomNumber}</h3>
          <span class="badge ${r.Status === 'Available' ? 'badge-success' : 'badge-warning'}">${r.Status}</span>
        </div>
        <div class="card-body">
          <div class="price-tag">$${r.PricePerNight}<span>/night</span></div>
          <div style="margin: 0; color:var(--text-muted); font-size:0.9rem;">${r.Description || ''}</div>
          <div class="info-row"><span class="label">Category</span><span class="value">${r.CategoryName}</span></div>
          <div class="info-row"><span class="label">Floor</span><span class="value">${r.Floor}</span></div>
          <div class="info-row"><span class="label">Max Occupants</span><span class="value">${r.MaxOccupants} guests</span></div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm" onclick="openBookRoom('${r.RoomNumber}', '${r.CategoryName}', ${r.PricePerNight}, ${r.MaxOccupants})"
            ${r.Status !== 'Available' ? 'disabled' : ''}>
            ${r.Status === 'Available' ? '📅 Book Now' : '🚫 Unavailable'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="alert alert-danger">Failed to load rooms. Is the server running?</div>';
  }
}

function clearRoomFilters() {
  ['r-checkin','r-checkout','r-minprice','r-maxprice','r-occupants'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  document.getElementById('r-category').value = '';
  loadRooms();
}

function quickSearch() {
  document.getElementById('r-checkin').value = document.getElementById('home-checkin').value;
  document.getElementById('r-checkout').value = document.getElementById('home-checkout').value;
  document.getElementById('r-category').value = document.getElementById('home-category').value;
  document.getElementById('r-occupants').value = document.getElementById('home-occupants').value;
  showPage('rooms');
  loadRooms();
}

// ===== BOOK ROOM =====
function openBookRoom(roomNumber, category, price, maxOcc) {
  if (!currentUser) { openModal('modal-login'); return; }
  selectedRoom = { roomNumber, category, price, maxOcc };
  document.getElementById('book-room-info').innerHTML = `
    <strong>Room ${roomNumber}</strong> — ${category}<br>
    <span style="color:var(--accent); font-weight:700;">$${price}/night</span> · Max ${maxOcc} guests
  `;
  document.getElementById('book-occupants').max = maxOcc;
  document.getElementById('book-room-alert').innerHTML = '';
  document.getElementById('book-price-preview').textContent = '';
  // Pre-fill dates from search
  const ci = document.getElementById('r-checkin').value;
  const co = document.getElementById('r-checkout').value;
  if (ci) document.getElementById('book-checkin').value = ci;
  if (co) document.getElementById('book-checkout').value = co;
  updatePricePreview();
  openModal('modal-book-room');
}

function updatePricePreview() {
  const ci = document.getElementById('book-checkin').value;
  const co = document.getElementById('book-checkout').value;
  if (ci && co && selectedRoom) {
    const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
    if (nights > 0) {
      document.getElementById('book-price-preview').innerHTML =
        `<strong>${nights} night${nights>1?'s':''} × $${selectedRoom.price} = <span style="color:var(--accent);">$${(nights * selectedRoom.price).toFixed(2)}</span></strong>`;
    }
  }
}
document.addEventListener('change', e => { if (['book-checkin','book-checkout'].includes(e.target.id)) updatePricePreview(); });

async function confirmBookRoom() {
  const body = {
    RoomNumber: selectedRoom.roomNumber,
    CheckInDate: document.getElementById('book-checkin').value,
    CheckOutDate: document.getElementById('book-checkout').value,
    NumOccupants: parseInt(document.getElementById('book-occupants').value)
  };
  if (!body.CheckInDate || !body.CheckOutDate) return showAlert('Please select check-in and check-out dates.', 'danger', 'book-room-alert');
  if (new Date(body.CheckOutDate) <= new Date(body.CheckInDate)) return showAlert('Check-out must be after check-in.', 'danger', 'book-room-alert');
  try {
    const res = await fetch(`${API}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error || 'Booking failed.', 'danger', 'book-room-alert');
    closeModal('modal-book-room');
    showAlert(`✅ Booking confirmed! Reference: <strong>${data.BookingReference}</strong>`, 'success');
    loadRooms();
  } catch { showAlert('Connection error.', 'danger', 'book-room-alert'); }
}

// ===== HALLS =====
async function loadHalls() {
  const container = document.getElementById('halls-list');
  if (!container) return;
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading halls...</p></div>';
  const params = new URLSearchParams();
  const date = document.getElementById('e-date')?.value;
  const start = document.getElementById('e-start')?.value;
  const end = document.getElementById('e-end')?.value;
  const att = document.getElementById('e-attendees')?.value;
  if (date) params.set('date', date);
  if (start) params.set('startTime', start);
  if (end) params.set('endTime', end);
  if (att) params.set('attendees', att);
  try {
    const res = await fetch(`${API}/events/halls?${params}`);
    const halls = await res.json();
    if (!halls.length) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🎪</div><p>No halls available for the selected criteria.</p></div>';
      return;
    }
    container.innerHTML = halls.map(h => `
      <div class="card">
        <div class="card-header">
          <h3>${h.HallName}</h3>
          <span class="badge badge-success">Available</span>
        </div>
        <div class="card-body">
          <div class="price-tag">$${h.BookingPricePerHour}<span>/hour</span></div>
          <div style="margin: 0; color:var(--text-muted); font-size:0.9rem;">${h.Description || ''}</div>
          <div class="info-row"><span class="label">Capacity</span><span class="value">${h.Capacity} guests</span></div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary btn-sm" onclick="openBookEvent(${h.HallID}, '${h.HallName}', ${h.BookingPricePerHour}, ${h.Capacity})">
            📅 Book Hall
          </button>
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<div class="alert alert-danger">Failed to load halls. Is the server running?</div>';
  }
}

function clearHallFilters() {
  ['e-date','e-start','e-end','e-attendees'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  loadHalls();
}

// ===== BOOK EVENT =====
function openBookEvent(hallId, hallName, pricePerHour, capacity) {
  if (!currentUser) { openModal('modal-login'); return; }
  selectedHall = { hallId, hallName, pricePerHour, capacity };
  document.getElementById('book-event-info').innerHTML = `
    <strong>${hallName}</strong><br>
    <span style="color:var(--accent); font-weight:700;">$${pricePerHour}/hour</span> · Capacity: ${capacity} guests
  `;
  document.getElementById('event-attendees').max = capacity;
  document.getElementById('book-event-alert').innerHTML = '';
  // Pre-fill from search
  const d = document.getElementById('e-date').value;
  const s = document.getElementById('e-start').value;
  const en = document.getElementById('e-end').value;
  if (d) document.getElementById('event-date').value = d;
  if (s) document.getElementById('event-start').value = s;
  if (en) document.getElementById('event-end').value = en;
  updateEventPricePreview();
  openModal('modal-book-event');
}

function updateEventPricePreview() {
  const start = document.getElementById('event-start').value;
  const end = document.getElementById('event-end').value;
  if (start && end && selectedHall) {
    const hours = (new Date(`1970-01-01T${end}`) - new Date(`1970-01-01T${start}`)) / 3600000;
    if (hours > 0) {
      document.getElementById('event-price-preview').innerHTML =
        `<strong>${hours} hour${hours>1?'s':''} × $${selectedHall.pricePerHour} = <span style="color:var(--accent);">$${(hours * selectedHall.pricePerHour).toFixed(2)}</span></strong>`;
    }
  }
}
document.addEventListener('change', e => { if (['event-start','event-end'].includes(e.target.id)) updateEventPricePreview(); });

async function confirmBookEvent() {
  const body = {
    HallID: selectedHall.hallId,
    EventType: document.getElementById('event-type').value,
    EventDate: document.getElementById('event-date').value,
    StartTime: document.getElementById('event-start').value,
    EndTime: document.getElementById('event-end').value,
    ExpectedAttendees: parseInt(document.getElementById('event-attendees').value)
  };
  if (!body.EventDate || !body.StartTime || !body.EndTime) return showAlert('Please fill in all event details.', 'danger', 'book-event-alert');
  if (body.EndTime <= body.StartTime) return showAlert('End time must be after start time.', 'danger', 'book-event-alert');
  try {
    const res = await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error || 'Booking failed.', 'danger', 'book-event-alert');
    closeModal('modal-book-event');
    showAlert(`✅ Event booked! Total charge: <strong>$${data.TotalCharge}</strong>`, 'success');
    loadHalls();
  } catch { showAlert('Connection error.', 'danger', 'book-event-alert'); }
}

// ===== MY RESERVATIONS =====
async function loadMyReservations() {
  const container = document.getElementById('tab-reservations');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/reservations/my`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const data = await res.json();
    if (!data.length) { container.innerHTML = '<div class="empty-state"><div class="icon">🛏</div><p>No reservations yet.</p></div>'; return; }
    container.innerHTML = `<div class="cards-grid">${data.map(r => `
      <div class="card">
        <div class="card-header">
          <h3>Room ${r.RoomNumber}</h3>
          <span class="badge ${statusBadge(r.Status)}">${r.Status}</span>
        </div>
        <div class="card-body">
          <div class="info-row"><span class="label">Reference</span><span class="value" style="font-family:monospace;">${r.BookingReference}</span></div>
          <div class="info-row"><span class="label">Category</span><span class="value">${r.CategoryName}</span></div>
          <div class="info-row"><span class="label">Check-In</span><span class="value">${fmtDate(r.CheckInDate)}</span></div>
          <div class="info-row"><span class="label">Check-Out</span><span class="value">${fmtDate(r.CheckOutDate)}</span></div>
          <div class="info-row"><span class="label">Guests</span><span class="value">${r.NumOccupants}</span></div>
          <div class="info-row"><span class="label">Invoice</span><span class="value">$${r.TotalAmount || '—'} <span class="badge ${payBadge(r.PaymentStatus)}">${r.PaymentStatus || '—'}</span></span></div>
        </div>
        <div class="card-footer">
          ${r.Status === 'Confirmed' ? `<button class="btn btn-danger btn-sm" onclick="cancelReservation(${r.ReservationID})">Cancel</button>` : ''}
          ${r.Status === 'Checked-Out' ? `<button class="btn btn-outline btn-sm" onclick="openFeedback(${r.ReservationID}, null)">⭐ Feedback</button>` : ''}
          ${r.InvoiceID ? `<button class="btn btn-outline btn-sm" onclick="viewInvoice(${r.InvoiceID})">🧾 Invoice</button>` : ''}
        </div>
      </div>
    `).join('')}</div>`;
  } catch { container.innerHTML = '<div class="alert alert-danger">Failed to load reservations.</div>'; }
}

async function cancelReservation(id) {
  if (!confirm('Cancel this reservation?')) return;
  try {
    const res = await fetch(`${API}/reservations/${id}/cancel`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Reservation cancelled.', 'success');
    loadMyReservations();
  } catch { showAlert('Error cancelling reservation.', 'danger'); }
}

// ===== MY EVENTS =====
async function loadMyEvents() {
  const container = document.getElementById('tab-events');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/events/my`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const data = await res.json();
    if (!data.length) { container.innerHTML = '<div class="empty-state"><div class="icon">🎪</div><p>No event bookings yet.</p></div>'; return; }
    container.innerHTML = `<div class="cards-grid">${data.map(e => `
      <div class="card">
        <div class="card-header">
          <h3>${e.EventType}</h3>
          <span class="badge ${statusBadge(e.Status)}">${e.Status}</span>
        </div>
        <div class="card-body">
          <div class="info-row"><span class="label">Hall</span><span class="value">${e.HallName}</span></div>
          <div class="info-row"><span class="label">Date</span><span class="value">${fmtDate(e.EventDate)}</span></div>
          <div class="info-row"><span class="label">Time</span><span class="value">${e.StartTime} – ${e.EndTime}</span></div>
          <div class="info-row"><span class="label">Attendees</span><span class="value">${e.ExpectedAttendees}</span></div>
          <div class="info-row"><span class="label">Invoice</span><span class="value">$${e.TotalAmount || '—'} <span class="badge ${payBadge(e.PaymentStatus)}">${e.PaymentStatus || '—'}</span></span></div>
        </div>
        <div class="card-footer">
          ${e.Status === 'Confirmed' ? `<button class="btn btn-danger btn-sm" onclick="cancelEvent(${e.EventID})">Cancel</button>` : ''}
          ${e.Status === 'Completed' ? `<button class="btn btn-outline btn-sm" onclick="openFeedback(null, ${e.EventID})">⭐ Feedback</button>` : ''}
          ${e.InvoiceID ? `<button class="btn btn-outline btn-sm" onclick="viewInvoice(${e.InvoiceID})">🧾 Invoice</button>` : ''}
        </div>
      </div>
    `).join('')}</div>`;
  } catch { container.innerHTML = '<div class="alert alert-danger">Failed to load events.</div>'; }
}

async function cancelEvent(id) {
  if (!confirm('Cancel this event booking?')) return;
  try {
    const res = await fetch(`${API}/events/${id}/cancel`, { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger');
    showAlert('Event booking cancelled.', 'success');
    loadMyEvents();
  } catch { showAlert('Error cancelling event.', 'danger'); }
}

// ===== MY FEEDBACK =====
async function loadMyFeedback() {
  const container = document.getElementById('tab-feedback');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/feedback/my`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const data = await res.json();
    if (!data.length) { container.innerHTML = '<div class="empty-state"><div class="icon">⭐</div><p>No feedback submitted yet.</p></div>'; return; }
    container.innerHTML = `<div class="cards-grid">${data.map(f => `
      <div class="card">
        <div class="card-header"><h3>${f.FeedbackType}</h3><span class="stars">${'⭐'.repeat(f.Rating)}</span></div>
        <div class="card-body">
          <div class="info-row"><span class="label">Reference</span><span class="value">${f.Reference}</span></div>
          <div class="info-row"><span class="label">Rating</span><span class="value">${f.Rating}/5</span></div>
          ${f.Comments ? `<p style="margin-top:0.75rem; font-size:0.9rem; color:var(--text-muted); font-style:italic;">"${f.Comments}"</p>` : ''}
          <div style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-muted);">${fmtDate(f.SubmittedDate)}</div>
        </div>
      </div>
    `).join('')}</div>`;
  } catch { container.innerHTML = '<div class="alert alert-danger">Failed to load feedback.</div>'; }
}

// ===== FEEDBACK MODAL =====
function openFeedback(reservationId, eventId) {
  document.getElementById('fb-reservation-id').value = reservationId || '';
  document.getElementById('fb-event-id').value = eventId || '';
  document.getElementById('fb-rating').value = '5';
  document.getElementById('fb-comments').value = '';
  document.getElementById('feedback-alert').innerHTML = '';
  openModal('modal-feedback');
}

async function submitFeedback() {
  const body = {
    Rating: parseInt(document.getElementById('fb-rating').value),
    Comments: document.getElementById('fb-comments').value.trim()
  };
  const resId = document.getElementById('fb-reservation-id').value;
  const evId = document.getElementById('fb-event-id').value;
  if (resId) body.ReservationID = parseInt(resId);
  if (evId) body.EventID = parseInt(evId);
  try {
    const res = await fetch(`${API}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error, 'danger', 'feedback-alert');
    closeModal('modal-feedback');
    showAlert('Thank you for your feedback! ⭐', 'success');
    loadMyFeedback();
  } catch { showAlert('Error submitting feedback.', 'danger', 'feedback-alert'); }
}

// ===== INVOICES =====
async function loadMyInvoices() {
  const container = document.getElementById('invoices-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API}/invoices/my`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const data = await res.json();
    if (!data.length) { container.innerHTML = '<div class="empty-state"><div class="icon">🧾</div><p>No invoices yet.</p></div>'; return; }
    container.innerHTML = `<div class="cards-grid">${data.map(inv => `
      <div class="card">
        <div class="card-header">
          <h3>Invoice #${inv.InvoiceID}</h3>
          <span class="badge ${payBadge(inv.PaymentStatus)}">${inv.PaymentStatus}</span>
        </div>
        <div class="card-body">
          <div class="info-row"><span class="label">Type</span><span class="value">${inv.InvoiceType}</span></div>
          <div class="info-row"><span class="label">Reference</span><span class="value">${inv.Reference}</span></div>
          <div class="info-row"><span class="label">Room Charges</span><span class="value">$${inv.RoomCharges}</span></div>
          <div class="info-row"><span class="label">Event Charges</span><span class="value">$${inv.EventCharges}</span></div>
          <div class="info-row"><span class="label">Additional</span><span class="value">$${inv.AdditionalCharges}</span></div>
          <div class="info-row" style="font-weight:700;"><span class="label">Total</span><span class="value" style="color:var(--accent);">$${inv.TotalAmount}</span></div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem;">Issued: ${fmtDate(inv.IssuedDate)}</div>
        </div>
        <div class="card-footer">
          <button class="btn btn-outline btn-sm" onclick="viewInvoice(${inv.InvoiceID})">🧾 View Details</button>
        </div>
      </div>
    `).join('')}</div>`;
  } catch { container.innerHTML = '<div class="alert alert-danger">Failed to load invoices.</div>'; }
}

async function viewInvoice(id) {
  try {
    const res = await fetch(`${API}/invoices/${id}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('gh_token')}` } });
    const inv = await res.json();
    document.getElementById('invoice-detail-content').innerHTML = `
      <div class="invoice-box" style="box-shadow:none; padding: 0;">
        <div class="invoice-header">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h2 style="color:var(--primary);">🏨 Grand Horizon Hotel</h2>
              <p style="color:var(--text-muted); font-size:0.88rem;">Tax Invoice</p>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.1rem; font-weight:700;">Invoice #${inv.InvoiceID}</div>
              <div style="font-size:0.85rem; color:var(--text-muted);">${fmtDate(inv.IssuedDate)}</div>
            </div>
          </div>
        </div>
        <div style="margin-bottom:1rem;">
          <div class="info-row"><span class="label">Customer</span><span class="value">${inv.CustomerName}</span></div>
          <div class="info-row"><span class="label">Type</span><span class="value">${inv.InvoiceType}</span></div>
          <div class="info-row"><span class="label">Reference</span><span class="value">${inv.Reference}</span></div>
          ${inv.CheckInDate ? `<div class="info-row"><span class="label">Check-In</span><span class="value">${fmtDate(inv.CheckInDate)}</span></div>` : ''}
          ${inv.CheckOutDate ? `<div class="info-row"><span class="label">Check-Out</span><span class="value">${fmtDate(inv.CheckOutDate)}</span></div>` : ''}
          ${inv.EventDate ? `<div class="info-row"><span class="label">Event Date</span><span class="value">${fmtDate(inv.EventDate)}</span></div>` : ''}
          ${inv.HallName ? `<div class="info-row"><span class="label">Hall</span><span class="value">${inv.HallName}</span></div>` : ''}
        </div>
        <div style="background:var(--bg); border-radius:8px; padding: 0; margin-bottom:1rem;">
          <div class="info-row"><span class="label">Room Charges</span><span class="value">$${inv.RoomCharges}</span></div>
          <div class="info-row"><span class="label">Event Charges</span><span class="value">$${inv.EventCharges}</span></div>
          <div class="info-row"><span class="label">Additional Charges</span><span class="value">$${inv.AdditionalCharges}</span></div>
          <div class="info-row" style="font-size:1.1rem; font-weight:800; border-top:2px solid var(--primary); padding-top:0.75rem; margin-top:0.5rem;">
            <span>TOTAL</span>
            <span class="invoice-total">$${inv.TotalAmount}</span>
          </div>
        </div>
        <div style="text-align:center;">
          <span class="badge ${payBadge(inv.PaymentStatus)}" style="font-size:0.9rem; padding: 0;">${inv.PaymentStatus}</span>
        </div>
      </div>
    `;
    openModal('modal-invoice');
  } catch { showAlert('Failed to load invoice details.', 'danger'); }
}

// ===== TABS =====
function switchTab(tabId, btn) {
  document.querySelectorAll('#page-bookings > div[id^="tab-"]').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');
}

// ===== HELPERS =====
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function statusBadge(s) {
  return { 'Confirmed':'badge-info', 'Checked-In':'badge-success', 'Checked-Out':'badge-muted',
           'Cancelled':'badge-danger', 'Completed':'badge-success', 'In Progress':'badge-warning' }[s] || 'badge-muted';
}
function payBadge(s) {
  return { 'Paid':'badge-success', 'Unpaid':'badge-danger', 'Partially Paid':'badge-warning' }[s] || 'badge-muted';
}