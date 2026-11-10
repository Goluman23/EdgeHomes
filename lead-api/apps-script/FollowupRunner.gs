// Runs every 10 minutes (installTrigger). For each lead: picks up desk stage changes,
// syncs SUPPRESS_* tags, and executes exactly one due follow-up step from FollowupEngine.gs.
// DRY RUN while Vercel FOLLOWUP_LIVE is unset — the API answers dryRun:true and sends nothing.

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'runFollowups') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('runFollowups').timeBased().everyMinutes(10).create();
}

function api_(path, payload) {
  var base = prop_('API_BASE', 'https://api.edgehomesarchitects.in');
  payload.secret = prop_('SHEET_LOG_SECRET', '');
  try {
    var res = UrlFetchApp.fetch(base + path, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
    var data = {}; try { data = JSON.parse(res.getContentText()); } catch (e) { data = { raw: res.getContentText().slice(0, 200) }; }
    return { code: res.getResponseCode(), data: data };
  } catch (err) { return { code: 0, data: { error: String(err) } }; }
}

function firstName_(n) { return String(n || '').trim().split(/\s+/)[0] || 'there'; }

function varsFor_(tpl, c) {
  var name = firstName_(c['Name']), city = c['City'] || 'NCR', designer = c['Designer'] || prop_('DESIGNER', 'our design lead');
  var visit = c['Visit at'] instanceof Date ? c['Visit at'] : null;
  var day = visit ? Utilities.formatDate(visit, 'Asia/Kolkata', 'EEE d MMM') : '';
  var time = visit ? Utilities.formatDate(visit, 'Asia/Kolkata', 'h:mm a') : '';
  var map = {
    s_nudge: [name], s_guide: [name, c['Property'] || 'your', city], s_ig_lastchance: [name],
    eh_fu_d1_guide: [name, city], eh_fu_d3_proof: [name, city], eh_fu_d7_muhurat: [name, prop_('MUHURAT_MONTH', 'February')],
    eh_fu_d14_checkin: [name, c['Interest'] || c['Property'] || 'home'], eh_fu_d21_close: [name],
    eh_q_slots: [name, designer, city, prop_('SLOT_1', 'Friday 11 AM'), prop_('SLOT_2', 'Saturday 11 AM')],
    eh_visit_confirm: [name, day, time, designer], eh_visit_reminder_eve: [name, time, prop_('STUDIO_PIN', 'studio location (to confirm)')],
    eh_visit_reminder_2h: [name, time, designer], eh_visit_rebook: [name, prop_('SLOT_1', 'Friday 11 AM'), prop_('SLOT_2', 'Saturday 11 AM')],
    eh_post_visit_ask: [name], eh_proposal_followup: [name, designer], eh_welcome_signed: [name, c['Society'] || city, designer],
    eh_nurture_monthly: [name, city]
  };
  return map[tpl.replace(/_hinglish$/, '')] || [name];
}

// Hinglish leads (column Language = hi) get the _hinglish version of a template when one exists.
var HINGLISH_TPLS = ['eh_fu_d1_guide', 'eh_fu_d3_proof', 'eh_fu_d7_muhurat', 'eh_fu_d14_checkin', 'eh_fu_d21_close'];
function tplFor_(tpl, c) {
  var lang = String(c['Language'] || '').toLowerCase();
  return (lang === 'hi' || lang === 'hinglish') && HINGLISH_TPLS.indexOf(tpl) >= 0 ? tpl + '_hinglish' : tpl;
}

function leadForEngine_(L) {
  var c = L.cols, s = L.state;
  return {
    stage: c['Stage'] || 'new', seq: s.seq || null, anchorAt: s.anchorAt || 0, sent: s.sent || [],
    stageChangedAt: s.stageChangedAt || 0, channel: c['Phone'] ? 'wa' : 'ig', lastInboundAt: s.lastInboundAt || 0,
    visitAt: c['Visit at'] instanceof Date ? c['Visit at'].getTime() : 0,
    pausedUntil: c['Paused until'] instanceof Date ? c['Paused until'].getTime() : 0,
    consent: c['Consent'] === 'YES' || s.consent === true
  };
}

function fulog_(L, step, tpl, action, result) {
  tab_(TABS.fulog).appendRow([new Date(), L.cols['Lead ID'], L.cols['Phone'], L.cols['Stage'], step || '', tpl || '', action, String(result || '').slice(0, 300)]);
}

function runFollowups() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var sh = tab_(TABS.leads), last = sh.getLastRow(), now = Date.now();
    for (var row = 2; row <= last; row++) {
      var L = readLead_(row);
      if (!L.cols['Lead ID']) continue;
      var deskStage = L.cols['Stage'] || 'new';
      // 1. Desk changed the stage → new sequence, pause cleared, revenue credited, sync tags.
      if (deskStage !== (L.state.stage || 'new')) {
        L.state.stage = deskStage; L.state.stageChangedAt = now; L.state.needsSync = true;
        L.state.pausedUntil = 0; L.cols['Paused until'] = '';
        if (deskStage === 'visit_booked' && L.state.lastTpl) bumpStat_(L.state.lastTpl, 'Visits booked', 1);
        if (deskStage === 'signed') {
          if (L.state.lastTpl) { bumpStat_(L.state.lastTpl, 'Signed', 1); bumpStat_(L.state.lastTpl, 'Revenue credited (₹)', Number(L.cols['Signed value (₹)'] || 0)); }
          if (!L.cols['Paid on']) L.cols['Paid on'] = '';
        }
      }
      // Pause expired → tags must drop SUPPRESS_HUMAN_PAUSE
      if (L.state.pausedUntil && L.state.pausedUntil <= now && L.cols['Paused until']) { L.cols['Paused until'] = ''; L.state.pausedUntil = 0; L.state.needsSync = true; }
      if (L.state.needsSync && L.cols['Phone']) {
        var sync = api_('/api/es/followup-sync', { phone: L.cols['Phone'], stage: deskStage, paused_until: L.state.pausedUntil || 0, city: L.cols['City'] || '', value: deskStage === 'signed' ? (Number(L.cols['Signed value (₹)']) || 0) : 0 });
        if (sync.code === 200) L.state.needsSync = false;
        fulog_(L, 'sync', '', 'sync', JSON.stringify(sync.data).slice(0, 200));
      }
      // 2. Plan the next step with the shared engine.
      var eng = refreshAnchor(leadForEngine_(L));
      L.state.seq = eng.seq; L.state.anchorAt = eng.anchorAt; L.state.sent = eng.sent;
      var plan = planNext(eng, now);
      var key = plan.step ? plan.step.key : '';
      if (plan.action === 'send') {
        var tpl = tplFor_(plan.step.tpl, L.cols);
        var r = api_('/api/es/followup-send', { lead_id: L.cols['Lead ID'], phone: L.cols['Phone'], channel: eng.channel, tpl: tpl, vars: varsFor_(tpl, L.cols), step: key });
        if (r.code === 200) {
          L.state.sent.push(key); L.state.lastTpl = tpl; L.state.lastSentAt = now; L.state.replyCredited = false;
          if (r.data && r.data.dryRun) L.state.dryMarks = (L.state.dryMarks || 0) + 1;
          L.cols['Last sent'] = new Date(now); L.cols['Messages sent'] = Number(L.cols['Messages sent'] || 0) + 1;
          bumpStat_(tpl, 'Sent', 1);
        }
        fulog_(L, key, tpl, r.data && r.data.dryRun ? 'DRY RUN' : 'send', r.code + ' ' + JSON.stringify(r.data).slice(0, 200));
      } else if (plan.action === 'task') {
        L.state.sent.push(key);
        L.cols['Next step'] = 'TASK: ' + plan.task; L.cols['Next due'] = new Date(plan.dueAt || now);
        fulog_(L, key, '', 'task', plan.task);
        var mail = prop_('DESK_EMAIL', '');
        if (mail) MailApp.sendEmail(mail, 'Edgehomes task · ' + (L.cols['Name'] || L.cols['Phone']), plan.task + '\nLead: ' + L.cols['Lead ID'] + ' · ' + L.cols['Phone'] + '\nStage: ' + deskStage);
        writeLead_(L); continue;
      } else if (plan.action === 'move') {
        L.state.sent.push(key);
        if (canAutoMove(deskStage, plan.to)) { L.cols['Stage'] = plan.to; L.state.stage = plan.to; L.state.stageChangedAt = now; L.state.needsSync = true; }
        fulog_(L, key, '', 'move', plan.to);
      } else if (plan.action === 'skip') {
        L.state.sent.push(key);
        fulog_(L, key, plan.step && plan.step.tpl, 'skip', plan.reason);
      }
      if (plan.action === 'wait') { L.cols['Next step'] = key || plan.reason; L.cols['Next due'] = new Date(plan.dueAt); }
      else if (plan.action === 'done') { L.cols['Next step'] = '—'; L.cols['Next due'] = ''; }
      writeLead_(L);
    }
  } finally { lock.releaseLock(); }
}

// Go-live day: clear steps that were only "sent" in dry run so real sends start fresh from now.
function resetDryRunMarks() {
  var sh = tab_(TABS.leads), last = sh.getLastRow(), now = Date.now();
  for (var row = 2; row <= last; row++) {
    var L = readLead_(row);
    if (!L.state.dryMarks) continue;
    L.state.sent = []; L.state.anchorAt = now; L.state.dryMarks = 0; L.state.lastTpl = '';
    writeLead_(L);
  }
}
