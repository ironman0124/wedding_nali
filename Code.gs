// ============================================================
// NALISHKA WEDDING PLANNER — Google Apps Script Web App
// Nalishka's Google Sheet ID already set below
// Deploy as: Execute as ME, Anyone can access
// ============================================================

var SS_ID = '1JxsoRHW8HqYrJEBeTnp8i9sZQiLkvmR6jV7JIx_-5hI';

var SHEETS = {
  haldi:   '🌿 Haldi Guest List',
  mendhi:  '💃 Mendhi Guest List',
  wedding: '💍Wedding Guest List',
  events:  '📅 Events & Functions',
  tasks:   '✅ To-Do List',
  expenses:'💰 Expenses'
};

function doGet(e) {
  e = e || { parameter: {} };
  var action = e.parameter.action || 'all';
  var ss = SpreadsheetApp.openById(SS_ID);
  var result = {};
  try {
    if (action === 'all' || action === 'guests') {
      result.haldi   = getGuests(ss, SHEETS.haldi);
      result.mendhi  = getGuests(ss, SHEETS.mendhi);
      result.wedding = getGuests(ss, SHEETS.wedding);
    }
    if (action === 'all' || action === 'events')   { result.events   = getEvents(ss); }
    if (action === 'all' || action === 'tasks')    { result.tasks    = getTasks(ss); }
    if (action === 'all' || action === 'expenses') { result.expenses = getExpenses(ss); }
    result.status = 'ok';
  } catch(err) {
    result.status = 'error';
    result.message = err.toString();
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.openById(SS_ID);
  var result = {};
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action;
    if      (action === 'updateGuestRSVP') { updateGuestRSVP(ss, payload.sheet, payload.row, payload.rsvp, payload.invite, payload.table, payload.diet, payload.contact, payload.notes); result.status = 'ok'; }
    else if (action === 'addGuest')        { addGuest(ss, payload.sheet, payload.data); result.status = 'ok'; }
    else if (action === 'addEvent')        { addEvent(ss, payload.data); result.status = 'ok'; }
    else if (action === 'updateEvent')     { updateEvent(ss, payload.row, payload.data); result.status = 'ok'; }
    else if (action === 'addTask')         { addTask(ss, payload.data); result.status = 'ok'; }
    else if (action === 'updateTask')      { updateTask(ss, payload.row, payload.data); result.status = 'ok'; }
    else if (action === 'addExpense')      { addExpense(ss, payload.data); result.status = 'ok'; }
    else if (action === 'updateExpense')   { updateExpense(ss, payload.row, payload.data); result.status = 'ok'; }
    else { result.status = 'error'; result.message = 'Unknown action: ' + action; }
  } catch(err) {
    result.status = 'error';
    result.message = err.toString();
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getGuests(ss, sheetName) {
  var ws = ss.getSheetByName(sheetName);
  if (!ws) return [];
  var lr = ws.getLastRow();
  if (lr < 3) return [];
  var data = ws.getRange(3, 1, lr - 2, 10).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[1] && !r[2]) continue;
    out.push({
      row: i + 3, no: r[0], name: r[1], surname: r[2],
      group: r[3], table: r[4], rsvp: r[5] || 'Pending',
      invite: r[6] || 'No', diet: r[7], contact: r[8], notes: r[9]
    });
  }
  return out;
}

function updateGuestRSVP(ss, sheetKey, row, rsvp, invite, table, diet, contact, notes) {
  var ws = ss.getSheetByName(SHEETS[sheetKey] || sheetKey);
  if (!ws) throw new Error('Sheet not found: ' + sheetKey);
  ws.getRange(row, 5).setValue(table   || '');
  ws.getRange(row, 6).setValue(rsvp    || 'Pending');
  ws.getRange(row, 7).setValue(invite  || 'No');
  ws.getRange(row, 8).setValue(diet    || '');
  ws.getRange(row, 9).setValue(contact || '');
  ws.getRange(row, 10).setValue(notes  || '');
  SpreadsheetApp.flush();
}

function addGuest(ss, sheetKey, data) {
  var ws = ss.getSheetByName(SHEETS[sheetKey] || sheetKey);
  if (!ws) throw new Error('Sheet not found: ' + sheetKey);
  var lr = ws.getLastRow() + 1;
  ws.getRange(lr, 1, 1, 10).setValues([[
    lr - 2, data.name || '', data.surname || '', data.group || 'Family',
    data.table || '', data.rsvp || 'Pending', data.invite || 'No',
    data.diet || '', data.contact || '', data.notes || ''
  ]]);
  SpreadsheetApp.flush();
}

function getEvents(ss) {
  var ws = ss.getSheetByName(SHEETS.events);
  if (!ws) return [];
  var lr = ws.getLastRow();
  if (lr < 3) return [];
  var data = ws.getRange(3, 1, lr - 2, 7).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[1]) continue;
    var dv = r[2] instanceof Date
      ? Utilities.formatDate(r[2], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : (r[2] || '').toString();
    out.push({ row: i + 3, no: r[0], name: r[1], date: dv, time: r[3], venue: r[4], notes: r[5], status: r[6] || 'Upcoming' });
  }
  return out;
}

function addEvent(ss, data) {
  var ws = ss.getSheetByName(SHEETS.events);
  var lr = ws.getLastRow() + 1;
  ws.getRange(lr, 1, 1, 7).setValues([[
    lr - 2, data.name || '', data.date || '',
    data.time || '', data.venue || '', data.notes || '', data.status || 'Upcoming'
  ]]);
  SpreadsheetApp.flush();
}

function updateEvent(ss, row, data) {
  var ws = ss.getSheetByName(SHEETS.events);
  ws.getRange(row, 2).setValue(data.name   || '');
  ws.getRange(row, 3).setValue(data.date   || '');
  ws.getRange(row, 4).setValue(data.time   || '');
  ws.getRange(row, 5).setValue(data.venue  || '');
  ws.getRange(row, 6).setValue(data.notes  || '');
  ws.getRange(row, 7).setValue(data.status || 'Upcoming');
  SpreadsheetApp.flush();
}

function getTasks(ss) {
  var ws = ss.getSheetByName(SHEETS.tasks);
  if (!ws) return [];
  var lr = ws.getLastRow();
  if (lr < 3) return [];
  var data = ws.getRange(3, 1, lr - 2, 7).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[1]) continue;
    var dv = r[4] instanceof Date
      ? Utilities.formatDate(r[4], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : (r[4] || '').toString();
    out.push({ row: i + 3, no: r[0], text: r[1], cat: r[2], assign: r[3], due: dv, status: r[5] || 'Pending', notes: r[6], done: r[5] === 'Done' });
  }
  return out;
}

function addTask(ss, data) {
  var ws = ss.getSheetByName(SHEETS.tasks);
  var lr = ws.getLastRow() + 1;
  ws.getRange(lr, 1, 1, 7).setValues([[
    lr - 2, data.text || '', data.cat || 'Other',
    data.assign || '', data.due || '', data.status || 'Pending', data.notes || ''
  ]]);
  SpreadsheetApp.flush();
}

function updateTask(ss, row, data) {
  var ws = ss.getSheetByName(SHEETS.tasks);
  ws.getRange(row, 2).setValue(data.text   || '');
  ws.getRange(row, 3).setValue(data.cat    || '');
  ws.getRange(row, 4).setValue(data.assign || '');
  ws.getRange(row, 5).setValue(data.due    || '');
  ws.getRange(row, 6).setValue(data.status || 'Pending');
  ws.getRange(row, 7).setValue(data.notes  || '');
  SpreadsheetApp.flush();
}

function getExpenses(ss) {
  var ws = ss.getSheetByName(SHEETS.expenses);
  if (!ws) return [];
  var lr = ws.getLastRow();
  if (lr < 3) return [];
  var data = ws.getRange(3, 1, lr - 2, 8).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (!r[1]) continue;
    out.push({ row: i + 3, no: r[0], name: r[1], cat: r[2], budget: r[3] || 0, actual: r[4] || 0, diff: r[5] || 0, status: r[6] || 'Pending', notes: r[7] });
  }
  return out;
}

function addExpense(ss, data) {
  var ws = ss.getSheetByName(SHEETS.expenses);
  var lr = ws.getLastRow() + 1;
  var b = parseFloat(data.budget) || 0;
  var a = parseFloat(data.actual) || 0;
  ws.getRange(lr, 1, 1, 8).setValues([[
    lr - 2, data.name || '', data.cat || '', b, a, b - a, data.status || 'Pending', data.notes || ''
  ]]);
  SpreadsheetApp.flush();
}

function updateExpense(ss, row, data) {
  var ws = ss.getSheetByName(SHEETS.expenses);
  var b = parseFloat(data.budget) || 0;
  var a = parseFloat(data.actual) || 0;
  ws.getRange(row, 2).setValue(data.name   || '');
  ws.getRange(row, 3).setValue(data.cat    || '');
  ws.getRange(row, 4).setValue(b);
  ws.getRange(row, 5).setValue(a);
  ws.getRange(row, 6).setValue(b - a);
  ws.getRange(row, 7).setValue(data.status || 'Pending');
  ws.getRange(row, 8).setValue(data.notes  || '');
  SpreadsheetApp.flush();
}
