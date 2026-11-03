// Follow-up engine — ONE source of truth. lead-api tests run it in Node; the build script
// (scripts/build-followup-gs.mjs) compiles it with time.js + calendar.js into
// apps-script/FollowupEngine.gs so the Google Sheet runs the identical logic.
// Keep this file free of Node-only APIs and optional chaining (Apps Script V8 safe).
import { MIN, HOUR, DAY, ist, istAt, addDaysYmd } from './time.js';
import { QUIET_DAYS } from './calendar.js';

export const FU_SEND_WINDOW = { startMin: 9 * 60 + 30, endMin: 20 * 60 + 30 };

// kind: session  = free-form inside WhatsApp's 24-h window (or Instagram's 24-h window)
//       template = approved WhatsApp template (category below); WhatsApp only
//       task     = a job for the desk (call, send 3D, proposal) — appears in "Next step"
//       move     = the engine moves the lead to another stage
export const CADENCE = {
  new: [
    { key: 'nudge_30m', after: 30 * MIN, kind: 'session', tpl: 's_nudge', ignoreWindow: true },
    { key: 'guide_2h', after: 2 * HOUR, kind: 'session', tpl: 's_guide' },
    { key: 'ig_last', after: 22 * HOUR, kind: 'task', channel: 'ig', task: 'Instagram last-chance before the 24-h window closes: send s_ig_lastchance and ask for a WhatsApp number' },
    { key: 'd1', after: 1 * DAY, kind: 'template', tpl: 'eh_fu_d1_guide', category: 'marketing' },
    { key: 'd3', after: 3 * DAY, kind: 'template', tpl: 'eh_fu_d3_proof', category: 'marketing' },
    { key: 'd6', after: 6 * DAY, kind: 'template', tpl: 'eh_fu_d6_muhurat', category: 'marketing' },
    { key: 'to_nurture', after: 8 * DAY, kind: 'move', to: 'nurture' },
  ],
  qualified: [
    { key: 'call_task', after: 0, kind: 'task', task: 'Designer call within 24 h — offer two studio slots' },
    { key: 'd1', after: 1 * DAY, kind: 'template', tpl: 'eh_q_slots', category: 'marketing' },
    { key: 'd3', after: 3 * DAY, kind: 'template', tpl: 'eh_fu_d3_proof', category: 'marketing' },
    { key: 'd6', after: 6 * DAY, kind: 'template', tpl: 'eh_fu_d6_muhurat', category: 'marketing' },
    { key: 'to_nurture', after: 9 * DAY, kind: 'move', to: 'nurture' },
  ],
  booked: [
    { key: 'confirm', at: 'anchor', kind: 'template', tpl: 'eh_visit_confirm', category: 'utility' },
    { key: 'eve', at: 'eve', kind: 'template', tpl: 'eh_visit_reminder_eve', category: 'utility' },
    { key: 'h2', at: 'h2', kind: 'template', tpl: 'eh_visit_reminder_2h', category: 'utility' },
    { key: 'outcome', at: 'after', kind: 'task', task: 'Mark Walked in or No-show' },
  ],
  no_show: [
    { key: 'rebook_call', after: 30 * MIN, kind: 'task', task: 'Call to rebook — offer two new slots' },
    { key: 'rebook_d1', after: 1 * DAY, kind: 'template', tpl: 'eh_visit_rebook', category: 'utility' },
    { key: 'to_nurture', after: 4 * DAY, kind: 'move', to: 'nurture' },
  ],
  walked_in: [
    { key: 'send_3d', after: 0, kind: 'task', task: 'Same day: WhatsApp their 3D + summary of choices' },
    { key: 'proposal', after: 2 * DAY, kind: 'task', task: 'Proposal due (48 h) — itemised + payment schedule' },
    { key: 'founder', after: 3 * DAY, kind: 'task', task: 'Founder call — answer the real doubt' },
    { key: 'ask_why', after: 5 * DAY, kind: 'template', tpl: 'eh_post_visit_ask', category: 'marketing' },
  ],
  proposal: [
    { key: 'check', after: 2 * DAY, kind: 'template', tpl: 'eh_proposal_followup', category: 'marketing' },
    { key: 'founder', after: 4 * DAY, kind: 'task', task: 'Founder call before decision meeting' },
    { key: 'decision', after: 7 * DAY, kind: 'task', task: 'Decision meeting — sign or set a January follow-up' },
  ],
  signed: [
    { key: 'welcome', after: 0, kind: 'template', tpl: 'eh_welcome_signed', category: 'utility' },
    { key: 'kickoff', after: 2 * DAY, kind: 'task', task: 'Kick-off: design schedule + first site visit' },
  ],
  nurture: [
    { key: 'm1', after: 30 * DAY, kind: 'template', tpl: 'eh_nurture_monthly', category: 'marketing' },
    { key: 'm2', after: 60 * DAY, kind: 'template', tpl: 'eh_nurture_monthly', category: 'marketing' },
    { key: 'm3', after: 90 * DAY, kind: 'template', tpl: 'eh_nurture_monthly', category: 'marketing' },
  ],
};

export const STAGE_SEQ = {
  new: 'new', qualifying: 'new', qualified: 'qualified', nurture: 'nurture', visit_booked: 'booked',
  no_show: 'no_show', walked_in: 'walked_in', proposal: 'proposal', signed: 'signed',
};
// A reply from the lead restarts these sequences from the reply time.
export const RESET_ON_REPLY = ['new', 'qualified', 'nurture'];
// Steps that still run while a person is handling the chat (human pause).
export const RUNS_DURING_PAUSE = ['booked'];

/** Move a due time out of quiet days and outside the IST send window. */
export function adjustDue(ts) {
  let t = ts;
  for (let i = 0; i < 5; i++) {
    const d = ist(t);
    if (QUIET_DAYS.indexOf(d.ymd) >= 0) { t = istAt(addDaysYmd(d.ymd, 1), 10, 0); continue; }
    if (d.minOfDay < FU_SEND_WINDOW.startMin) { t = istAt(d.ymd, 9, 30); continue; }
    if (d.minOfDay > FU_SEND_WINDOW.endMin) { t = istAt(addDaysYmd(d.ymd, 1), 9, 30); continue; }
    break;
  }
  return t;
}

/** Bring the lead's sequence state up to date (call before planNext). Pure. */
export function refreshAnchor(lead) {
  const seq = STAGE_SEQ[lead.stage] || null;
  const out = Object.assign({}, lead);
  out.sent = (lead.sent || []).slice();
  if (seq !== lead.seq) { out.seq = seq; out.anchorAt = lead.stageChangedAt || lead.anchorAt || 0; out.sent = []; }
  if (seq && RESET_ON_REPLY.indexOf(seq) >= 0 && (lead.lastInboundAt || 0) > (out.anchorAt || 0)) {
    out.anchorAt = lead.lastInboundAt; out.sent = [];
  }
  return out;
}

function dueFor(step, lead) {
  if (step.at === 'anchor') return lead.anchorAt;
  if (step.at === 'eve') { if (!lead.visitAt) return null; return istAt(addDaysYmd(ist(lead.visitAt).ymd, -1), 19, 0); }
  if (step.at === 'h2') return lead.visitAt ? lead.visitAt - 2 * HOUR : null;
  if (step.at === 'after') return lead.visitAt ? lead.visitAt + 30 * MIN : null;
  return (lead.anchorAt || 0) + step.after;
}

/**
 * Decide the single next action for a lead. Pure function.
 * lead: { stage, seq, anchorAt, sent[], channel 'wa'|'ig', lastInboundAt, visitAt, pausedUntil, consent }
 * returns { action: 'send'|'task'|'move'|'skip'|'wait'|'done', step, dueAt, reason }
 */
export function planNext(lead, now) {
  const seq = lead.seq;
  if (!seq || !CADENCE[seq]) return { action: 'done', reason: 'no sequence for stage ' + lead.stage };
  const paused = lead.pausedUntil && lead.pausedUntil > now;
  if (paused && RUNS_DURING_PAUSE.indexOf(seq) < 0) return { action: 'wait', dueAt: lead.pausedUntil, reason: 'human handling' };
  const steps = CADENCE[seq];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if ((lead.sent || []).indexOf(step.key) >= 0) continue;
    if (step.channel && step.channel !== lead.channel) continue;
    const raw = dueFor(step, lead);
    if (raw == null) return { action: 'skip', step, reason: 'no visit time' };
    // Reminders whose moment has passed by more than an hour are skipped, not sent late.
    if (step.at && step.at !== 'after' && step.at !== 'anchor' && now > raw + HOUR) return { action: 'skip', step, reason: 'moment passed' };
    const dueAt = step.kind === 'task' || step.kind === 'move' || step.at || step.ignoreWindow ? raw : adjustDue(raw);
    if (now < dueAt) return { action: 'wait', step, dueAt };
    const sinceInbound = now - (lead.lastInboundAt || 0);
    if (step.kind === 'session') {
      if (lead.channel === 'ig') return { action: 'skip', step, dueAt, reason: 'Instagram session nudges run inside the inbox bot' };
      if (sinceInbound >= 24 * HOUR) return { action: 'skip', step, dueAt, reason: '24-h window closed' };
      return { action: 'send', step, dueAt };
    }
    if (step.kind === 'template') {
      if (lead.channel === 'ig') {
        // Instagram cannot receive WhatsApp templates; inside 7 days the desk may use the human-agent tag.
        if (sinceInbound < 7 * DAY) return { action: 'task', step, dueAt, task: 'Instagram follow-up by hand (human agent tag): ' + step.tpl };
        return { action: 'skip', step, dueAt, reason: 'Instagram window closed' };
      }
      if (step.category === 'marketing' && lead.consent !== true) return { action: 'skip', step, dueAt, reason: 'no marketing consent' };
      return { action: 'send', step, dueAt };
    }
    if (step.kind === 'task') return { action: 'task', step, dueAt, task: step.task };
    if (step.kind === 'move') return { action: 'move', step, dueAt, to: step.to };
  }
  return { action: 'done', reason: 'sequence complete' };
}
