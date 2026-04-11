/* ══════════════════════════════════════════════
   WEDDING PLANNER — app.js
   Dharmesh & Nalishka | ironman0124.github.io/wedding
   Live sync with Google Sheets via Apps Script
══════════════════════════════════════════════ */

// ── CONFIG ────────────────────────────────────────────────────
// 👇 PASTE YOUR APPS SCRIPT WEB APP URL HERE after deploying
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbza7_AEtgwoGEHw2N_a8_lSSz1yV-4Cg01KlT3eO82ie8N1m_90nulei59poU5Av3GAUw/exec';

const CREDENTIALS = { username: 'nali2808', password: 'Nali!2808' };

// ── AUTH ──────────────────────────────────────────────────────
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  if (u === CREDENTIALS.username && p === CREDENTIALS.password) {
    sessionStorage.setItem('wpa_auth', '1');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    initApp();
  } else {
    err.textContent = 'Incorrect username or password.';
    document.getElementById('login-pass').value = '';
    setTimeout(() => err.textContent = '', 3000);
  }
}

function doLogout() {
  sessionStorage.removeItem('wpa_auth');
  location.reload();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-screen') &&
      document.getElementById('login-screen').style.display !== 'none') doLogin();
});

if (sessionStorage.getItem('wpa_auth') === '1') {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

// ── STATE ─────────────────────────────────────────────────────
let state = {
  haldi:    [], mendhi: [], wedding: [],
  events:   [], tasks:  [], expenses: [],
  loading:  false
};

// ── API ───────────────────────────────────────────────────────
async function apiGet(action = 'all') {
  // Apps Script URL is configured
  try {
    const res = await fetch(`${SCRIPT_URL}?action=${action}`, { method: 'GET' });
    const json = await res.json();
    if (json.status !== 'ok') throw new Error(json.message || 'Error');
    return json;
  } catch(e) {
    showBanner('⚠️ Could not reach Google Sheets. Check your connection.', 'error');
    return null;
  }
}

async function apiPost(payload) {
  // Apps Script URL is configured
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch(e) {
    showBanner('⚠️ Could not save to Google Sheets.', 'error');
    return null;
  }
}

// ── INIT ──────────────────────────────────────────────────────
async function initApp() {
  showLoadingOverlay(true);
  const data = await apiGet('all');
  if (data) {
	state.haldi    = data.haldi    || [];
	state.mendhi   = data.mendhi    || [];
    state.wedding  = data.wedding  || [];
    state.events   = data.events   || [];
    state.tasks    = data.tasks    || [];
    state.expenses = data.expenses || [];
    showBanner('✅ Synced with Google Sheets', 'success', 3000);
  } else {
    // fallback to localStorage
	state.haldi    = JSON.parse(localStorage.getItem('wpa_haldi')    || '[]');
	state.mendhi   = JSON.parse(localStorage.getItem('wpa_mendhi')   || '[]');
    state.wedding  = JSON.parse(localStorage.getItem('wpa_wedding')  || '[]');
    state.events   = JSON.parse(localStorage.getItem('wpa_events')   || '[]');
    state.tasks    = JSON.parse(localStorage.getItem('wpa_tasks')    || '[]');
    state.expenses = JSON.parse(localStorage.getItem('wpa_expenses') || '[]');
  }
  showLoadingOverlay(false);
  renderDashboard();
  renderGuestList('haldi');
  renderEvents();
  renderTasks();
  renderExpenses();
}

function saveLocal() {
  localStorage.setItem('wpa_haldi',    JSON.stringify(state.haldi));
  localStorage.setItem('wpa_mendhi',   JSON.stringify(state.mendhi));
  localStorage.setItem('wpa_wedding',  JSON.stringify(state.wedding));
  localStorage.setItem('wpa_events',   JSON.stringify(state.events));
  localStorage.setItem('wpa_tasks',    JSON.stringify(state.tasks));
  localStorage.setItem('wpa_expenses', JSON.stringify(state.expenses));
}

// ── HELPERS ───────────────────────────────────────────────────
function rsvpBadge(r) {
  const map = { Yes:'badge-yes', No:'badge-no', Pending:'badge-pending', Optional:'badge-optional' };
  return `<span class="badge ${map[r]||'badge-pending'}">${r||'Pending'}</span>`;
}
function fmt(n) { return Number(n||0).toLocaleString('en-ZA'); }
function formatDate(d) {
  if (!d) return 'TBD';
  try { return new Date(d).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); }
  catch(e) { return d; }
}
function formatTime(t) {
  if (!t) return '';
  var s = String(t).trim();
  // Handle ISO datetime from Google Sheets e.g. "1899-12-30T21:00:00.000Z"
  if (s.indexOf('T') !== -1) {
    var parts = s.split('T');
    var timePart = parts[1] ? parts[1].replace('Z','').replace('.000','') : '';
    var match = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      var h = parseInt(match[1], 10);
      var m = match[2];
      var sec = match[3] || '00';
      var ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + m + ':' + sec + ' ' + ampm;
    }
  }
  // Handle plain HH:MM or HH:MM:SS
  var match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    var h = parseInt(match[1], 10);
    var m = match[2];
    var sec = match[3] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ':' + sec + ' ' + ampm;
  }
  return s;
}
function guestList(tab) { return state[tab] || []; }

// ── BANNER ────────────────────────────────────────────────────
function showBanner(msg, type = 'info', autoDismiss = 0) {
  const b = document.getElementById('sync-banner');
  if (!b) return;
  b.textContent = msg;
  b.className = `sync-banner ${type}`;
  b.style.display = 'block';
  if (autoDismiss) setTimeout(() => b.style.display = 'none', autoDismiss);
}

function showLoadingOverlay(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ── NAV ───────────────────────────────────────────────────────
const TITLES = {
  dashboard:'Dashboard', guests:'Guest Lists',
  events:'Events & Dates', tasks:'To-Do List', expenses:'Expenses'
};

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.querySelector(`[data-section="${id}"]`).classList.add('active');
  document.getElementById('topbar-title').textContent = TITLES[id] || id;
  if (id === 'dashboard') renderDashboard();
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const tabs = [
    { key:'haldi',   label:'🌿 Haldi Day', 			color:'teal',   evIdx:1 },
	{ key:'mendhi',  label:'💃 Mendhi Day', 		color:'purple',   evIdx:2 },
    { key:'wedding', label:'💍 Wedding Day',        color:'red',    evIdx:3 },
  ];

  let html = '';
  tabs.forEach(t => {
    const guests = guestList(t.key);
    const total     = guests.length;
    const confirmed = guests.filter(g => g.rsvp === 'Yes').length;
    const pending   = guests.filter(g => g.rsvp === 'Pending').length;
    const declined  = guests.filter(g => g.rsvp === 'No').length;
    const optional  = guests.filter(g => g.rsvp === 'Optional').length;
    const invites   = guests.filter(g => g.invite === 'Yes').length;
    const ev = state.events[t.evIdx] || {};
    const dateStr = ev.date ? formatDate(ev.date) + (ev.time ? ' · ' + formatTime(ev.time) : '') + (ev.venue ? ' · ' + ev.venue : '') : 'Date TBD — add in Events & Functions tab';

    html += `
    <div class="dash-event-block ${t.color}">
      <div class="dash-event-title">${t.label}</div>
      <div class="dash-event-date">📅 ${dateStr}</div>
      <div class="dash-event-stats">
        <div class="dash-stat"><div class="ds-label">TOTAL</div><div class="ds-val">${total}</div></div>
        <div class="dash-stat"><div class="ds-label">CONFIRMED ✓</div><div class="ds-val green">${confirmed}</div></div>
        <div class="dash-stat"><div class="ds-label">PENDING ⏳</div><div class="ds-val orange">${pending}</div></div>
        <div class="dash-stat"><div class="ds-label">DECLINED ✗</div><div class="ds-val red">${declined}</div></div>
        <div class="dash-stat"><div class="ds-label">OPTIONAL</div><div class="ds-val gray">${optional}</div></div>
        <div class="dash-stat"><div class="ds-label">INVITES SENT</div><div class="ds-val blue">${invites}</div></div>
      </div>
    </div>`;
  });

  // Tasks & Expenses
  const tasksDone    = state.tasks.filter(t => t.done || t.status === 'Done').length;
  const tasksPending = state.tasks.filter(t => !t.done && t.status !== 'Done').length;
  const pct          = state.tasks.length ? Math.round(tasksDone / state.tasks.length * 100) : 0;
  // Filter out TOTAL summary row — only count real expense entries
  const validExp     = state.expenses.filter(e => e.name && String(e.name).toUpperCase() !== 'TOTAL' && e.cat);
  // Nalishka sheet: budget=Total(R), actual=Paid(R), diff=Balance(R)
  const totalR       = validExp.reduce((a, e) => a + Number(e.budget||0), 0);
  const paidR        = validExp.reduce((a, e) => a + Number(e.actual||0), 0);
  const balanceR     = validExp.reduce((a, e) => a + Number(e.diff||0),   0);

  html += `
  <div class="dash-row-2">
    <div class="dash-card">
      <div class="card-title">📋 TASKS OVERVIEW</div>
      <div class="dash-event-stats">
        <div class="dash-stat"><div class="ds-label">PENDING</div><div class="ds-val orange">${tasksPending}</div></div>
        <div class="dash-stat"><div class="ds-label">DONE ✓</div><div class="ds-val green">${tasksDone}</div></div>
        <div class="dash-stat"><div class="ds-label">TOTAL</div><div class="ds-val">${state.tasks.length}</div></div>
        <div class="dash-stat"><div class="ds-label">% DONE</div><div class="ds-val teal">${pct}%</div></div>
      </div>
    </div>
    <div class="dash-card">
      <div class="card-title">💰 EXPENSES (ZAR)</div>
      <div class="dash-event-stats">
        <div class="dash-stat"><div class="ds-label">TOTAL (R)</div><div class="ds-val gold">R ${fmt(totalR)}</div></div>
        <div class="dash-stat"><div class="ds-label">PAID (R)</div><div class="ds-val green">R ${fmt(paidR)}</div></div>
        <div class="dash-stat"><div class="ds-label">BALANCE (R)</div><div class="ds-val orange">R ${fmt(balanceR)}</div></div>
      </div>
    </div>
  </div>`;

  document.getElementById('dashboard-content').innerHTML = html;
}

// ── GUEST LIST ────────────────────────────────────────────────
let currentGuestTab = 'haldi';

function switchGuestTab(tab) {
  currentGuestTab = tab;
  document.querySelectorAll('.guest-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-gtab="${tab}"]`).classList.add('active');
  renderGuestList(tab);
}

function renderGuestList(tab) {
  tab = tab || currentGuestTab;
  currentGuestTab = tab;
  const q    = (document.getElementById('guest-search')?.value || '').toLowerCase();
  const rsvpF= document.getElementById('rsvp-filter')?.value || '';
  const list = guestList(tab).filter(g => {
    const nm = ((g.name||'')+' '+(g.surname||'')).toLowerCase();
    return (!q || nm.includes(q)) && (!rsvpF || g.rsvp === rsvpF);
  });

  document.getElementById('guest-tbody').innerHTML = list.map(g => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">${g.no||''}</td>
      <td style="font-weight:400;font-family:var(--font-body);">${g.name||''} <span style="color:var(--text-muted);font-size:12px;">${g.surname||''}</span></td>
      <td style="color:var(--text-muted);font-size:12px;">${g.group||''}</td>
      <td style="color:var(--text-muted);">${g.table||'–'}</td>
      <td>${rsvpBadge(g.rsvp)}</td>
      <td><span class="badge ${g.invite==='Yes'?'badge-yes':'badge-no'}">${g.invite||'No'}</span></td>
      <td style="color:var(--text-muted);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${g.notes||''}</td>
      <td style="display:flex;gap:4px;">
        <button class="btn-icon" onclick="editGuest('${tab}',${g.row})" title="Edit">✎</button>
        <button class="btn-icon" style="color:var(--red);" onclick="deleteGuest('${tab}',${g.row})" title="Delete">🗑</button>
      </td>
    </tr>`).join('') || `<tr><td colspan="8" class="empty-state">No guests found</td></tr>`;

  document.getElementById('guest-count').textContent = `Showing ${list.length} of ${guestList(tab).length} guests`;
}


async function deleteGuest(tab, row) {
  if (!confirm('Remove this guest from the list?')) return;
  showBanner('🗑 Deleting guest…', 'info');
  const res = await apiPost({ action: 'deleteGuest', sheet: tab, row });
  if (res && res.status === 'ok') {
    state[tab] = state[tab].filter(g => g.row !== row);
    saveLocal();
    renderGuestList(tab);
    renderDashboard();
    showBanner('✅ Guest deleted!', 'success', 3000);
  } else {
    showBanner('⚠️ Could not delete guest', 'error', 4000);
  }
}
function editGuest(tab, row) {
  const g = guestList(tab).find(x => x.row === row);
  if (!g) return;
  document.getElementById('g-modal-title').textContent = 'Edit Guest';
  document.getElementById('g-name').value    = g.name || '';
  document.getElementById('g-surname').value = g.surname || '';
  document.getElementById('g-group').value   = g.group || 'Family';
  document.getElementById('g-table').value   = g.table || '';
  document.getElementById('g-rsvp').value    = g.rsvp || 'Pending';
  document.getElementById('g-invite').value  = g.invite || 'No';
  document.getElementById('g-contact').value = g.contact || '';
  document.getElementById('g-notes').value   = g.notes || '';
  window._editGuestTab = tab;
  window._editGuestRow = row;
  openModal('modal-guest');
}

function openAddGuest() {
  document.getElementById('g-modal-title').textContent = 'Add Guest';
  ['g-name','g-surname','g-table','g-diet','g-contact','g-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('g-group').value  = 'Family';
  document.getElementById('g-rsvp').value   = 'Pending';
  document.getElementById('g-invite').value = 'No';
  window._editGuestTab = currentGuestTab;
  window._editGuestRow = null;
  openModal('modal-guest');
}

async function saveGuest() {
  const data = {
    name:    document.getElementById('g-name').value.trim(),
    surname: document.getElementById('g-surname').value.trim(),
    group:   document.getElementById('g-group').value,
    table:   document.getElementById('g-table').value,
    rsvp:    document.getElementById('g-rsvp').value,
    invite:  document.getElementById('g-invite').value,
    contact: document.getElementById('g-contact').value.trim(),
    notes:   document.getElementById('g-notes').value.trim(),
  };
  if (!data.name) return;

  closeModal('modal-guest');
  showBanner('💾 Saving to Google Sheets…', 'info');

  const tab = window._editGuestTab || currentGuestTab;
  const row = window._editGuestRow;

  if (row) {
    // Update existing — send full row including name, surname, group
    const res = await apiPost({
      action: 'updateGuestRSVP', sheet: tab, row,
      name: data.name, surname: data.surname, group: data.group,
      table: data.table, rsvp: data.rsvp, invite: data.invite,
      contact: data.contact, notes: data.notes
    });
    if (res && res.status === 'ok') {
      const g = state[tab].find(x => x.row === row);
      if (g) Object.assign(g, data);
      showBanner('✅ Saved to Google Sheets!', 'success', 3000);
    } else {
      showBanner('⚠️ Could not save to Google Sheets', 'error', 4000);
    }
  } else {
    // Add new
    const res = await apiPost({ action: 'addGuest', sheet: tab, data });
    if (res && res.status === 'ok') {
      // Reload from sheet
      const fresh = await apiGet('guests');
      if (fresh) {
        state.haldi   = fresh.haldi   || state.haldi;
		state.mendhi  = fresh.mendhi  || state.mendhi;
        state.wedding = fresh.wedding || state.wedding;
      }
      showBanner('✅ Guest added to Google Sheets!', 'success', 3000);
    } else {
      // Fallback: add locally
      state[tab].push({ ...data, row: Date.now(), no: state[tab].length + 1 });
    }
  }
  saveLocal();
  renderGuestList(tab);
  renderDashboard();
}

// ── EVENTS ────────────────────────────────────────────────────
function renderEvents() {
  document.getElementById('events-list').innerHTML = state.events.map(e => `
    <div class="event-card">
      <div>
        <div class="event-card-name">${e.name}</div>
        <div class="event-card-meta">${formatDate(e.date)}${e.time?' · '+formatTime(e.time):''}${e.venue?' · '+e.venue:''}</div>
        ${e.notes?`<div class="event-card-meta" style="margin-top:4px;">${e.notes}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="btn-icon" onclick="editEvent(${e.row})" title="Edit">✎</button>
        <button class="btn-icon" style="color:var(--red);" onclick="deleteEvent(${e.row})" title="Delete">🗑</button>
      </div>
    </div>`).join('') || `<div class="empty-state">No events yet</div>`;
}


async function deleteEvent(row) {
  if (!confirm('Remove this event?')) return;
  showBanner('🗑 Deleting event…', 'info');
  const res = await apiPost({ action: 'deleteEvent', row });
  if (res && res.status === 'ok') {
    state.events = state.events.filter(e => e.row !== row);
    saveLocal();
    renderEvents();
    renderDashboard();
    showBanner('✅ Event deleted!', 'success', 3000);
  } else {
    showBanner('⚠️ Could not delete event', 'error', 4000);
  }
}
function editEvent(row) {
  const e = state.events.find(x => x.row === row);
  if (!e) return;
  // Ensure date is in yyyy-MM-dd format for the date input
  let dateVal = '';
  if (e.date) {
    try {
      const d = new Date(e.date);
      if (!isNaN(d)) {
        dateVal = d.toISOString().split('T')[0];
      } else {
        dateVal = e.date;
      }
    } catch(_) { dateVal = e.date; }
  }
  // Clean time — remove any ISO date prefix, just keep HH:MM or HH:MM:SS
  let timeVal = '';
  if (e.time) {
    const t = String(e.time);
    if (t.indexOf('T') !== -1) {
      // Extract time part from ISO string
      const tPart = t.split('T')[1] || '';
      timeVal = tPart.replace('Z','').replace('.000','').substring(0,8);
    } else {
      timeVal = t.substring(0,8);
    }
  }
  document.getElementById('ev-name').value  = e.name  || '';
  document.getElementById('ev-date').value  = dateVal;
  document.getElementById('ev-time').value  = timeVal;
  document.getElementById('ev-venue').value = e.venue || '';
  document.getElementById('ev-notes').value = e.notes || '';
  window._editEventRow = row;
  openModal('modal-event');
}

function openAddEvent() {
  ['ev-name','ev-date','ev-time','ev-venue','ev-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  window._editEventRow = null;
  openModal('modal-event');
}

async function saveEvent() {
  const data = {
    name:  document.getElementById('ev-name').value.trim(),
    date:  document.getElementById('ev-date').value,
    time:  document.getElementById('ev-time').value.trim(),
    venue: document.getElementById('ev-venue').value.trim(),
    notes: document.getElementById('ev-notes').value.trim(),
    status:'Upcoming'
  };
  if (!data.name) return;
  const row = window._editEventRow;  // capture BEFORE closeModal resets it
  window._editEventRow = null;
  closeModal('modal-event');
  showBanner('💾 Saving to Google Sheets…', 'info');
  let res;
  if (row) {
    res = await apiPost({ action: 'updateEvent', row, data });
    if (res && res.status === 'ok') {
      const e = state.events.find(x => x.row === row);
      if (e) Object.assign(e, data);
      showBanner('✅ Event updated!', 'success', 3000);
    } else {
      showBanner('⚠️ Could not update event', 'error', 4000);
    }
  } else {
    res = await apiPost({ action: 'addEvent', data });
    if (res && res.status === 'ok') {
      const fresh = await apiGet('events');
      if (fresh) state.events = fresh.events || state.events;
    } else {
      state.events.push({ ...data, row: Date.now() });
    }
  }
  saveLocal();
  renderEvents();
  renderDashboard();
  showBanner('✅ Event saved!', 'success', 3000);
}

// ── TASKS ─────────────────────────────────────────────────────
function renderTasks() {
  const sf = document.getElementById('task-status-filter')?.value || '';
  const cf = document.getElementById('task-cat-filter')?.value || '';
  const list = state.tasks.filter(t =>
    (!sf || (sf==='Done' ? (t.done||t.status==='Done') : (!t.done && t.status!=='Done'))) &&
    (!cf || t.cat === cf)
  ).sort((a, b) => {
    const aDone = a.done || a.status === 'Done';
    const bDone = b.done || b.status === 'Done';
    // Done tasks always go to the bottom
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    // Sort by due date ascending — tasks without due date go last
    const aDate = a.due ? new Date(a.due) : null;
    const bDate = b.due ? new Date(b.due) : null;
    if (aDate && bDate) return aDate - bDate;
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    return 0;
  });

  document.getElementById('task-list').innerHTML = list.map(t => {
    const done = t.done || t.status === 'Done';
    return `
    <div class="task-item" style="background:var(--dark2);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:0.5rem;padding:0.9rem 1rem;">
      <div class="task-check ${done?'done':''}" onclick="toggleTask(${t.row})" title="${done?'Mark pending':'Mark done'}">${done?'✓':''}</div>
      <div style="flex:1;">
        <div class="task-text ${done?'done':''}" style="font-weight:400;">${t.text}</div>
        <div class="task-meta" style="margin-top:3px;">
          <span style="color:var(--gold);font-size:11px;">${t.cat||''}</span>
          ${t.assign?`<span style="color:var(--text-muted);font-size:11px;"> · ${t.assign}</span>`:''}
          ${t.due?`<span style="color:var(--text-muted);font-size:11px;"> · Due ${formatDate(t.due)}</span>`:''}
          <span style="margin-left:4px;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;background:${done?'rgba(39,174,96,0.2)':'rgba(230,126,34,0.2)'};color:${done?'#27AE60':'#E67E22'};">${t.status||'Pending'}</span>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn-icon" onclick="openEditTask(${t.row})" title="Edit">✎</button>
        <button class="btn-icon" style="color:var(--red);" onclick="deleteTask(${t.row})" title="Delete">🗑</button>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state">No tasks found 🎉</div>`;
}

async function toggleTask(row) {
  const t = state.tasks.find(x => x.row === row);
  if (!t) return;
  t.done   = !t.done;
  t.status = t.done ? 'Done' : 'Pending';
  saveLocal();
  renderTasks();
  renderDashboard();
  const res = await apiPost({ action: 'updateTask', row, data: t });
  if (res && res.status === 'ok') {
    showBanner('✅ Task updated!', 'success', 2000);
  }
}

async function deleteTask(row) {
  if (!confirm('Delete this task?')) return;
  showBanner('🗑 Deleting task…', 'info');
  const res = await apiPost({ action: 'deleteTask', row });
  if (res && res.status === 'ok') {
    state.tasks = state.tasks.filter(t => t.row !== row);
    saveLocal(); renderTasks(); renderDashboard();
    showBanner('✅ Task deleted!', 'success', 3000);
  } else {
    showBanner('⚠️ Could not delete task', 'error', 4000);
  }
}

function openAddTask() {
  ['t-text','t-assign','t-due'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('t-cat').value    = 'Other';
  document.getElementById('t-status').value = 'Pending';
  window._editTaskRow = null;
  document.getElementById('task-modal-title').textContent = 'Add Task';
  openModal('modal-task');
}

function openEditTask(row) {
  const t = state.tasks.find(x => x.row === row);
  if (!t) return;
  document.getElementById('t-text').value   = t.text   || '';
  document.getElementById('t-cat').value    = t.cat    || 'Other';
  document.getElementById('t-assign').value = t.assign || '';
  document.getElementById('t-due').value    = t.due    || '';
  document.getElementById('t-status').value = t.status || 'Pending';
  window._editTaskRow = row;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  openModal('modal-task');
}

async function saveTask() {
  const data = {
    text:   document.getElementById('t-text').value.trim(),
    cat:    document.getElementById('t-cat').value,
    assign: document.getElementById('t-assign').value.trim(),
    due:    document.getElementById('t-due').value,
    status: document.getElementById('t-status').value || 'Pending',
    notes:  ''
  };
  if (!data.text) return;
  const row = window._editTaskRow;  // capture BEFORE closeModal resets it
  window._editTaskRow = null;
  closeModal('modal-task');
  showBanner('💾 Saving task…', 'info');
  if (row) {
    // Update existing task
    const res = await apiPost({ action: 'updateTask', row, data });
    if (res && res.status === 'ok') {
      const t = state.tasks.find(x => x.row === row);
      if (t) Object.assign(t, data, { done: data.status === 'Done' });
      showBanner('✅ Task updated!', 'success', 3000);
    } else {
      showBanner('⚠️ Could not update task', 'error', 4000);
    }
  } else {
    // Add new task
    const res = await apiPost({ action: 'addTask', data });
    if (res && res.status === 'ok') {
      const fresh = await apiGet('tasks');
      if (fresh) state.tasks = fresh.tasks || state.tasks;
      showBanner('✅ Task saved!', 'success', 3000);
    } else {
      state.tasks.push({ ...data, row: Date.now(), done: false });
    }
  }
  saveLocal(); renderTasks(); renderDashboard();
}

// ── EXPENSES ──────────────────────────────────────────────────
function renderExpenses() {
  // Filter out TOTAL summary row and blank rows
  const validExp = state.expenses.filter(e => e.name && String(e.name).toUpperCase() !== 'TOTAL' && e.cat);
  // Nalishka sheet: budget=Total(R), actual=Paid(R), diff=Balance(R)
  const totalR   = validExp.reduce((a,e) => a + Number(e.budget||0), 0);
  const paidR    = validExp.reduce((a,e) => a + Number(e.actual||0), 0);
  const balanceR = validExp.reduce((a,e) => a + Number(e.diff||0),   0);

  document.getElementById('expense-stats').innerHTML = `
    <div class="stat-card gold"><div class="stat-label">TOTAL (R)</div><div class="stat-value" style="font-size:1.3rem;">R ${fmt(totalR)}</div></div>
    <div class="stat-card green"><div class="stat-label">PAID (R)</div><div class="stat-value" style="font-size:1.3rem;">R ${fmt(paidR)}</div></div>
    <div class="stat-card orange"><div class="stat-label">BALANCE (R)</div><div class="stat-value" style="font-size:1.3rem;">R ${fmt(balanceR)}</div></div>`;

  document.getElementById('expense-tbody').innerHTML = validExp.map((e,i) => {
    const balColor = Number(e.diff||0) > 0 ? '#E67E22' : '#27AE60';
    const st = e.status==='Paid'?'badge-yes': e.status==='Deposit Paid'?'badge-deposit':'badge-pending';
    return `<tr>
      <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
      <td style="font-weight:400;">${e.name}</td>
      <td style="font-size:12px;color:var(--text-muted);">${e.cat}</td>
      <td style="color:var(--gold);">R ${fmt(e.budget)}</td>
      <td style="color:#27AE60;">R ${fmt(e.actual)}</td>
      <td style="color:${balColor};font-weight:600;">R ${fmt(e.diff)}</td>
      <td><span class="badge ${st}">${e.status}</span></td>
      <td style="display:flex;gap:4px;">
        <button class="btn-icon" onclick="editExpense(${e.row})" title="Edit">✎</button>
        <button class="btn-icon" style="color:var(--red);" onclick="deleteExpense(${e.row})" title="Delete">🗑</button>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="empty-state">No expenses yet</td></tr>`;
}


async function deleteExpense(row) {
  if (!confirm('Delete this expense?')) return;
  showBanner('🗑 Deleting expense…', 'info');
  const res = await apiPost({ action: 'deleteExpense', row });
  if (res && res.status === 'ok') {
    state.expenses = state.expenses.filter(e => e.row !== row);
    saveLocal(); renderExpenses(); renderDashboard();
    showBanner('✅ Expense deleted!', 'success', 3000);
  } else {
    showBanner('⚠️ Could not delete expense', 'error', 4000);
  }
}
function editExpense(row) {
  const e = state.expenses.find(x => x.row === row);
  if (!e) return;
  document.getElementById('ex-name').value   = e.name   || '';
  document.getElementById('ex-cat').value    = e.cat    || '';
  document.getElementById('ex-status').value = e.status || 'Pending';
  document.getElementById('ex-budget').value = e.budget || 0;
  document.getElementById('ex-actual').value = e.actual || 0;
  document.getElementById('ex-notes').value  = e.notes  || '';
  window._editExpenseRow = row;
  openModal('modal-expense');
}

function openAddExpense() {
  ['ex-name','ex-budget','ex-actual','ex-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('ex-cat').value    = 'Venue';
  document.getElementById('ex-status').value = 'Pending';
  window._editExpenseRow = null;
  openModal('modal-expense');
}

async function saveExpense() {
  const data = {
    name:   document.getElementById('ex-name').value.trim(),
    cat:    document.getElementById('ex-cat').value,
    status: document.getElementById('ex-status').value,
    budget: parseFloat(document.getElementById('ex-budget').value) || 0,
    actual: parseFloat(document.getElementById('ex-actual').value) || 0,
    notes:  document.getElementById('ex-notes').value.trim(),
  };
  if (!data.name) return;
  const row = window._editExpenseRow;  // capture BEFORE closeModal resets it
  window._editExpenseRow = null;
  closeModal('modal-expense');
  showBanner('💾 Saving expense…', 'info');
  let res;
  if (row) {
    res = await apiPost({ action: 'updateExpense', row, data });
    if (res && res.status === 'ok') {
      const e = state.expenses.find(x => x.row === row);
      if (e) Object.assign(e, data);
      saveLocal(); renderExpenses(); renderDashboard();
      showBanner('✅ Expense updated!', 'success', 3000);
      return;
    } else {
      showBanner('⚠️ Could not update expense', 'error', 4000);
      return;
    }
  } else {
    res = await apiPost({ action: 'addExpense', data });
    if (res && res.status === 'ok') {
      const fresh = await apiGet('expenses');
      if (fresh) state.expenses = fresh.expenses || state.expenses;
    } else {
      state.expenses.push({ ...data, row: Date.now() });
    }
  }
  saveLocal(); renderExpenses(); renderDashboard();
  showBanner('✅ Expense saved!', 'success', 3000);
}

// ── MODALS ────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  window._editEventRow    = null;
  window._editExpenseRow  = null;
  window._editTaskRow     = null;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// ── SYNC BUTTON ───────────────────────────────────────────────
async function manualSync() {
  showBanner('🔄 Syncing with Google Sheets…', 'info');
  showLoadingOverlay(true);
  const data = await apiGet('all');
  if (data) {
    state.haldi    = data.haldi    || state.haldi;
	state.mendhi   = data.mendhi   || state.mendhi;
    state.wedding  = data.wedding  || state.wedding;
    state.events   = data.events   || state.events;
    state.tasks    = data.tasks    || state.tasks;
    state.expenses = data.expenses || state.expenses;
    saveLocal();
    renderDashboard();
    renderGuestList(currentGuestTab);
    renderEvents();
    renderTasks();
    renderExpenses();
    showBanner('✅ Synced successfully!', 'success', 3000);
  }
  showLoadingOverlay(false);
}
