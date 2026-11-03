// Edgehomes Sheet Logger — the ONE journey record per lead.
// Deploy: Extensions → Apps Script → paste Code.gs, FollowupEngine.gs, FollowupRunner.gs, appsscript.json
// → Project Settings → Script properties: SHEET_LOG_SECRET, API_BASE, DESIGNER, DESK_EMAIL
// → run setupSheet() once → Deploy → New deployment → Web app (execute as me, anyone) → copy …/exec URL
//   into Vercel SHEET_LOG_URL.

var COLS = ['Lead ID', 'Name', 'Phone', 'IG handle', 'Channel', 'Stage', 'City', 'Society', 'Property', 'Possession',
  'Budget', 'Score', 'Tier', 'Qualified', 'First source', 'Last source', 'Campaign', 'Consent', 'Consent source',
  'First enquiry', 'Last inbound', 'Last sent', 'Messages sent', 'Next step', 'Next due', 'Visit at', 'Designer',
  'Lost reason', 'Proposal value (₹)', 'Signed value (₹)', 'Paid on', 'Paused until', 'Notes', 'State', 'Language'];
var TABS = {
  leads: 'Leads',
  convo: 'Conversations',
  fulog: 'Follow-up log',
  stats: 'Follow-up stats',
  camp: 'Campaign log',
  events: 'Events'
};
var HUMAN_PAUSE_HOURS = 48;

function prop_(k, d) { var v = PropertiesService.getScriptProperties().getProperty(k); return v == null || v === '' ? d : v; }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tab_(name) { return ss_().getSheetByName(name); }
function col_(name) { return COLS.indexOf(name) + 1; }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Edgehomes')
    .addItem('Set up sheet (first time)', 'setupSheet')
    .addItem('Run follow-ups now', 'runFollowups')
    .addItem('Install 10-minute trigger', 'installTrigger')
    .addSeparator()
    .addItem('Reset dry-run marks (go-live day)', 'resetDryRunMarks')
    .addToUi();
}

function setupSheet() {
  var ss = ss_();
  var leads = tab_(TABS.leads) || ss.insertSheet(TABS.leads);
  leads.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold').setBackground('#0F1E36').setFontColor('#F1EADB');
  leads.setFrozenRows(1);
  leads.hideColumns(col_('State'));
  var stageRule = SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(STAGES), true).build();
  leads.getRange(2, col_('Stage'), 2000, 1).setDataValidation(stageRule);
  var lostRule = SpreadsheetApp.newDataValidation().requireValueInList(LOST_REASONS, true).build();
  leads.getRange(2, col_('Lost reason'), 2000, 1).setDataValidation(lostRule);
  leads.getRange(2, col_('Visit at'), 2000, 1).setNumberFormat('dd mmm yyyy, h:mm am/pm');
  [['convo', ['When', 'Lead ID', 'Phone / IG', 'Channel', 'Direction', 'Text', 'Intent', 'Handoff', 'Source']],
   ['fulog', ['When', 'Lead ID', 'Phone', 'Stage', 'Step', 'Template', 'Action', 'Result']],
   ['stats', ['Template', 'Sent', 'Replies within 48 h', 'Visits booked', 'Signed', 'Revenue credited (₹)']],
   ['camp', ['When', 'Campaign', 'Phone', 'Result']],
   ['events', ['When', 'Action', 'Payload']]].forEach(function (t) {
    var sh = tab_(TABS[t[0]]) || ss.insertSheet(TABS[t[0]]);
    sh.getRange(1, 1, 1, t[1].length).setValues([t[1]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  SpreadsheetApp.getUi && SpreadsheetApp.getActive().toast('Edgehomes sheet ready');
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  if (!body.secret || body.secret !== prop_('SHEET_LOG_SECRET', '')) return json_({ ok: false, error: 'bad secret' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = Date.now();
    var r;
    if (body.action === 'lead') r = onLead_(body, now);
    else if (body.action === 'wa_message') r = onInbound_(body, 'wa', now);
    else if (body.action === 'concierge') r = onConcierge_(body, now);
    else if (body.action === 'wa_status') r = logEvent_('wa_status', body);
    else if (body.action === 'campaign_log') r = campaignLog_(body);
    else if (body.action === 'campaign_sent') r = campaignSent_(body.campaigns || []);
    else r = logEvent_(body.action || 'unknown', body);
    return json_({ ok: true, result: r });
  } finally { lock.releaseLock(); }
}

function logEvent_(action, payload) {
  var p = JSON.parse(JSON.stringify(payload)); delete p.secret;
  tab_(TABS.events).appendRow([new Date(), action, JSON.stringify(p).slice(0, 45000)]);
  return 'logged';
}

// ---------- identity: one row per normalised phone (or IG handle when no phone yet) ----------
function findRow_(phone, ig) {
  var sh = tab_(TABS.leads), last = sh.getLastRow();
  if (last < 2) return 0;
  var phones = sh.getRange(2, col_('Phone'), last - 1, 1).getValues();
  var igs = sh.getRange(2, col_('IG handle'), last - 1, 1).getValues();
  for (var i = 0; i < phones.length; i++) {
    if (phone && String(phones[i][0]) === String(phone)) return i + 2;
  }
  // An IG-only record is matched by handle; it is never merged into a different phone.
  for (var j = 0; j < igs.length; j++) {
    if (ig && String(igs[j][0]).toLowerCase() === String(ig).toLowerCase() && (!phone || !phones[j][0])) return j + 2;
  }
  return 0;
}

function readLead_(row) {
  var sh = tab_(TABS.leads);
  var vals = sh.getRange(row, 1, 1, COLS.length).getValues()[0];
  var o = {};
  COLS.forEach(function (c, i) { o[c] = vals[i]; });
  var state = {}; try { state = JSON.parse(o['State'] || '{}'); } catch (e) { state = {}; }
  return { row: row, cols: o, state: state };
}

function writeLead_(L) {
  var sh = tab_(TABS.leads);
  L.cols['State'] = JSON.stringify(L.state);
  sh.getRange(L.row, 1, 1, COLS.length).setValues([COLS.map(function (c) { return L.cols[c] === undefined ? '' : L.cols[c]; })]);
}

function newLead_(phone, ig, channel, now) {
  var sh = tab_(TABS.leads);
  var row = sh.getLastRow() + 1;
  var cols = {};
  COLS.forEach(function (c) { cols[c] = ''; });
  cols['Lead ID'] = 'EH-' + Utilities.formatDate(new Date(now), 'Asia/Kolkata', 'yyMMdd') + '-' + ('000' + (row - 1)).slice(-4);
  cols['Phone'] = phone || ''; cols['IG handle'] = ig || ''; cols['Channel'] = channel;
  cols['Stage'] = 'new'; cols['First enquiry'] = new Date(now); cols['Messages sent'] = 0;
  return { row: row, cols: cols, state: { stage: 'new', stageChangedAt: now, sent: [], seq: null } };
}

function getOrCreate_(phone, ig, channel, now) {
  var row = findRow_(phone, ig);
  if (row) return readLead_(row);
  return newLead_(phone, ig, channel, now);
}

function setStageAuto_(L, to, now) {
  var from = L.state.stage || L.cols['Stage'] || 'new';
  if (!canAutoMove(from, to)) return false;
  L.cols['Stage'] = to; L.state.stage = to; L.state.stageChangedAt = now; L.state.needsSync = true;
  return true;
}

function mergeSource_(L, tag) {
  if (!tag) return;
  if (!L.cols['First source'] || L.cols['First source'] === 'SRC_UNKNOWN') L.cols['First source'] = tag;
  if (tag !== 'SRC_UNKNOWN') L.cols['Last source'] = tag;
}

function pause_(L, now, hours) {
  var until = now + (hours || HUMAN_PAUSE_HOURS) * 3600000;
  L.state.pausedUntil = until; L.cols['Paused until'] = new Date(until); L.state.needsSync = true;
}

function convo_(L, channel, dir, text, intent, handoff, source) {
  tab_(TABS.convo).appendRow([new Date(), L.cols['Lead ID'], L.cols['Phone'] || L.cols['IG handle'], channel, dir, String(text || '').slice(0, 1000), intent || '', handoff ? 'YES' : '', source || '']);
}

// ---------- events ----------
function onLead_(b, now) {
  var L = getOrCreate_(b.phone, '', 'form', now);
  ['name', 'city', 'society', 'property'].forEach(function (k) {
    var c = k.charAt(0).toUpperCase() + k.slice(1);
    if (b[k] && !L.cols[c]) L.cols[c] = b[k];
  });
  if (b.possession) L.cols['Possession'] = b.possession;
  if (b.budget) L.cols['Budget'] = b.budget;
  if (b.score != null) { L.cols['Score'] = Math.max(Number(L.cols['Score'] || 0), b.score); L.cols['Tier'] = b.tier; }
  if (b.qualified) L.cols['Qualified'] = 'YES';
  if (b.campaign) L.cols['Campaign'] = b.campaign;
  if (b.consent === true) { L.cols['Consent'] = 'YES'; L.state.consent = true; if (b.consentSource) L.cols['Consent source'] = b.consentSource; }
  mergeSource_(L, b.source);
  L.state.lastInboundAt = now; L.cols['Last inbound'] = new Date(now);
  if (b.stage) setStageAuto_(L, b.stage, now);
  writeLead_(L);
  return L.cols['Lead ID'];
}

function onInbound_(b, channel, now) {
  var L = getOrCreate_(b.phone, b.ig || '', channel, now);
  if (b.name && !L.cols['Name']) L.cols['Name'] = b.name;
  if (b.city && !L.cols['City']) L.cols['City'] = b.city;
  mergeSource_(L, b.source);
  var ts = b.ts || now;
  // Reply attribution: a reply within 48 h credits the last template sent.
  if (b.intent !== 'stop' && L.state.lastTpl && L.state.lastSentAt && ts - L.state.lastSentAt < 48 * 3600000 && !L.state.replyCredited) {
    bumpStat_(L.state.lastTpl, 'Replies within 48 h', 1); L.state.replyCredited = true;
  }
  L.state.lastInboundAt = ts; L.cols['Last inbound'] = new Date(ts);
  applyIntent_(L, b.intent, b.handoff, now);
  convo_(L, channel, 'in', b.text || ('[' + (b.type || 'media') + ']'), b.intent, b.handoff, b.sourceCode || b.source);
  writeLead_(L);
  return L.cols['Lead ID'];
}

function onConcierge_(b, now) {
  var L = getOrCreate_(b.phone, b.ig || '', b.channel || 'wa', now);
  if (b.name && !L.cols['Name']) L.cols['Name'] = b.name;
  if ((b.channel || 'wa') === 'ig') { L.state.lastInboundAt = now; L.cols['Last inbound'] = new Date(now); }
  applyIntent_(L, b.intent, b.handoff, now);
  if (b.stage) setStageAuto_(L, b.stage, now);
  if (b.pauseHours) pause_(L, now, b.pauseHours);
  convo_(L, b.channel || 'wa', 'bot', b.reply, b.intent, b.handoff, b.source);
  writeLead_(L);
  return L.cols['Lead ID'];
}

function applyIntent_(L, intent, handoff, now) {
  var stage = L.state.stage || 'new';
  if (intent === 'stop') { setStageAuto_(L, 'opted_out', now); L.cols['Consent'] = 'NO'; L.state.consent = false; return; }
  if (stage === 'opted_out' && (intent === 'greeting' || intent === 'resubscribe')) { setStageAuto_(L, 'new', now); return; }
  if ((intent === 'job' || intent === 'vendor') && stage === 'new') { setStageAuto_(L, 'not_lead', now); return; }
  if (stage === 'new' && intent && intent !== 'greeting' && intent !== 'unknown') setStageAuto_(L, 'qualifying', now);
  if (handoff) pause_(L, now, HUMAN_PAUSE_HOURS);
}

function bumpStat_(tpl, colName, n) {
  var sh = tab_(TABS.stats);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var c = head.indexOf(colName) + 1;
  if (c < 1) return;
  var last = sh.getLastRow(), row = 0;
  if (last >= 2) {
    var names = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < names.length; i++) if (names[i][0] === tpl) { row = i + 2; break; }
  }
  if (!row) { row = last + 1; sh.getRange(row, 1, 1, 6).setValues([[tpl, 0, 0, 0, 0, 0]]); }
  var cell = sh.getRange(row, c);
  cell.setValue(Number(cell.getValue() || 0) + n);
}

// ---------- campaign log: nobody gets the same campaign twice ----------
function campaignLog_(b) {
  var sh = tab_(TABS.camp), now = new Date();
  (b.rows || []).forEach(function (r) { sh.appendRow([now, b.campaign, r.phone, r.ok ? 'sent' : ('failed ' + (r.status || r.error || ''))]); });
  return (b.rows || []).length;
}
function campaignSent_(ids) {
  var sh = tab_(TABS.camp), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 2, last - 1, 3).getValues()
    .filter(function (r) { return ids.indexOf(r[0]) >= 0 && r[2] === 'sent'; })
    .map(function (r) { return String(r[1]); });
}
