// GENERATED FILE — do not edit. Source: lead-api/lib/{time.js,calendar.js,stages.js,followups.js}
// Rebuild with: cd lead-api && npm run build:gs

// ---- time.js ----
// All business logic runs in IST (UTC+05:30) regardless of server time zone.
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const IST_OFFSET = 330 * MIN;

/** {y, m (1-12), d, hh, mm, dow (0=Sun), ymd:'YYYY-MM-DD', minOfDay} in IST */
function ist(ts) {
  const d = new Date(Number(ts) + IST_OFFSET);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  const hh = d.getUTCHours(), mm = d.getUTCMinutes();
  const ymd = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { y, m, d: day, hh, mm, dow: d.getUTCDay(), ymd, minOfDay: hh * 60 + mm };
}

/** Epoch ms for an IST wall-clock time on a YYYY-MM-DD date. */
function istAt(ymd, hh = 0, mm = 0) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET;
}

function addDaysYmd(ymd, n) {
  return ist(istAt(ymd, 12) + n * DAY).ymd;
}

// ---- calendar.js ----
// THE ONE CALENDAR. Concierge, follow-ups, the sheet engine and the n8n scoreboard all
// read this file. Change offers and dates here only. An offerLine of null means
// "no offer is confirmed" and no message may mention one.

const CALENDAR_VERSION = '2026-11-01';

// Sign-by-deadline benefit (sprint offer). Confirm terms with Edgehomes before use.
const BENEFIT = {
  deadline: '2026-11-15',
  confirmed: false, // TO_CONFIRM: flip to true once Mr Deepak / Ms Priya approve the wording
  line: 'Sign by 15 Nov: design fee adjusted against execution, price locked till 31 Jan, plus one upgrade.',
};

const SEASONS = [
  { id: 'sprint', start: '2026-10-25', end: '2026-11-15', label: 'Possession Pack sprint',
    offerLine: 'Bring your floor plan, leave with your living room and kitchen in 3D and a price band in 60 minutes.' },
  { id: 'muhurat', start: '2026-11-16', end: '2026-12-20', label: 'Griha pravesh season', offerLine: null },
  { id: 'xmas', start: '2026-12-21', end: '2026-12-25', label: 'Christmas', offerLine: null },
  { id: 'newyear', start: '2026-12-26', end: '2027-01-15', label: 'New Year', offerLine: null },
];

// Festivals: greetings only, never an offer in the same message.
const FESTIVALS = {
  '2026-11-06': 'Dhanteras', '2026-11-08': 'Diwali', '2026-11-10': 'Govardhan Puja',
  '2026-11-11': 'Bhai Dooj', '2026-11-15': 'Chhath', '2026-12-25': 'Christmas', '2027-01-01': 'New Year',
};

// Studio holiday hours. Shown in timings / location / visit replies only within 7 days of the date,
// never inside offer templates. TO_CONFIRM with the studio before each festival.
// { date: 'YYYY-MM-DD', label: 'Diwali', hours: null (closed) | '10 AM – 2 PM' }
const SPECIAL_HOURS = [];

// No automated follow-ups on these days; due steps move to the next day.
const QUIET_DAYS = ['2026-11-08', '2026-12-25', '2027-01-01'];

// Ads: cold spend halved 6–10 Nov (Diwali); retargeting and follow-ups stay on.
const REDUCED_SPEND = { start: '2026-11-06', end: '2026-11-10' };

// Griha pravesh dates as published by Astroyogi (checked 25 Oct 2026). December: TO_CONFIRM.
const MUHURATS = ['2026-11-11', '2026-11-14', '2026-11-20', '2026-11-21', '2026-11-25', '2026-11-26'];

// Price bands to quote (Delhi NCR 2026, Interior Company). Bands only — never an exact quote.
const PRICE_BANDS = [
  { key: '2bhk', label: '2 BHK', perSqft: '₹1,000–1,200/sq ft', total: '₹8–11 lakh' },
  { key: '3bhk', label: '3 BHK', perSqft: '₹1,200–1,700/sq ft', total: '₹10–15 lakh' },
  { key: '4bhk', label: '4 BHK', perSqft: '₹2,000–2,200/sq ft', total: '₹14–20 lakh' },
  { key: 'villa', label: 'Villa / builder floor', perSqft: '₹3,000–3,500/sq ft', total: '₹18–25 lakh+' },
];

function seasonAt(ts) {
  const { ymd } = ist(ts);
  return SEASONS.find(s => ymd >= s.start && ymd <= s.end) || { id: 'evergreen', label: 'Evergreen', offerLine: null };
}
const isQuietDay = ts => QUIET_DAYS.includes(ist(ts).ymd);
const festivalOn = ts => FESTIVALS[ist(ts).ymd] || null;
function benefitActive(ts) {
  return BENEFIT.confirmed && ist(ts).ymd <= BENEFIT.deadline;
}
function upcomingMuhurats(ts, n = 3) {
  const { ymd } = ist(ts);
  return MUHURATS.filter(d => d >= ymd).slice(0, n);
}

/** Holiday-hours lines for the next 7 days (empty when none). */
function specialHoursNotes(ts) {
  const { ymd } = ist(ts);
  const until = ist(ts + 7 * 86400000).ymd;
  return SPECIAL_HOURS.filter(h => h.date >= ymd && h.date <= until)
    .map(h => `${h.label} (${h.date.slice(8)}/${h.date.slice(5, 7)}): ${h.hours ? h.hours : 'studio closed'}`);
}

// ---- stages.js ----
// ONE lead, ONE stage. Customer status always overrides campaign status.
const STAGES = {
  new:          { label: 'New',            seq: 'new',      acquisition: true },
  qualifying:   { label: 'Qualifying',     seq: 'new',      acquisition: true },
  qualified:    { label: 'Qualified',      seq: 'qualified',acquisition: true },
  nurture:      { label: 'Nurture',        seq: 'nurture',  acquisition: true },
  visit_booked: { label: 'Visit booked',   seq: 'booked',   acquisition: false },
  no_show:      { label: 'No-show',        seq: 'no_show',  acquisition: false },
  walked_in:    { label: 'Walked in',      seq: 'walked_in',acquisition: false },
  proposal:     { label: 'Proposal sent',  seq: 'proposal', acquisition: false },
  signed:       { label: 'Signed',         seq: 'signed',   acquisition: false },
  client:       { label: 'Active client',  seq: null,       acquisition: false },
  past_client:  { label: 'Past client',    seq: null,       acquisition: false },
  lost:         { label: 'Lost',           seq: null,       acquisition: false },
  opted_out:    { label: 'Opted out',      seq: null,       acquisition: false },
  not_lead:     { label: 'Not a lead',     seq: null,       acquisition: false },
};
const STAGE_KEYS = Object.keys(STAGES);
const LOST_REASONS = ['Price / budget', 'Timing — not ready yet', 'Chose another designer', 'Location / distance',
  'Scope too small', 'Possession delayed', 'Could not be contacted', 'Other'];

const CUSTOMER = new Set(['signed', 'client', 'past_client']);

/** Can the system (not the desk) move a lead from -> to? Desk edits are always accepted. */
function canAutoMove(from, to) {
  if (!STAGES[to]) return false;
  if (from === to) return false;
  if (to === 'opted_out') return true;                       // opt-out always wins
  if (from === 'opted_out') return to === 'new';             // only a fresh message re-subscribes
  if (CUSTOMER.has(from)) return CUSTOMER.has(to);           // customers never fall back into acquisition
  if (from === 'not_lead') return false;
  if (to === 'not_lead') return ['new', 'qualifying'].includes(from);
  if (to === 'lost') return true;                            // any non-customer can be lost
  const order = ['new', 'qualifying', 'qualified', 'nurture', 'visit_booked', 'no_show', 'walked_in', 'proposal', 'signed', 'client'];
  if (to === 'nurture') return ['new', 'qualifying'].includes(from);
  if (to === 'no_show') return from === 'visit_booked';
  if (to === 'visit_booked') return ['new', 'qualifying', 'qualified', 'nurture', 'no_show'].includes(from);
  return order.indexOf(to) > order.indexOf(from);           // forward only
}

/** SUPPRESS_* tags a stage must carry. pausedUntil adds SUPPRESS_HUMAN_PAUSE. */
function suppressionFor(stage, { pausedUntil = 0, now = Date.now() } = {}) {
  const tags = [];
  if (stage === 'opted_out') tags.push('SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING');
  if (stage === 'not_lead') tags.push('SUPPRESS_MARKETING');
  if (stage === 'signed' || stage === 'client') tags.push('SUPPRESS_CLIENT');
  if (stage === 'past_client') tags.push('SUPPRESS_ACQUISITION');
  if (['visit_booked', 'walked_in', 'proposal'].includes(stage)) tags.push('SUPPRESS_ACQUISITION');
  if (pausedUntil && pausedUntil > now) tags.push('SUPPRESS_HUMAN_PAUSE');
  return tags;
}
const ALL_SUPPRESS = ['SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING', 'SUPPRESS_CLIENT', 'SUPPRESS_ACQUISITION', 'SUPPRESS_HUMAN_PAUSE'];

/** Tag diff to send to EasySocial / ManyChat. */
function suppressionDiff(stage, opts) {
  const want = new Set(suppressionFor(stage, opts));
  return { add: [...want], remove: ALL_SUPPRESS.filter(t => !want.has(t)) };
}

/** Is this broadcast/campaign allowed for this lead right now? */
function eligibleFor(lead, campaign) {
  const s = lead.stage;
  if (s === 'opted_out' || s === 'not_lead') return { ok: false, why: 'suppressed' };
  if (campaign.kind === 'marketing' && lead.consent !== true) return { ok: false, why: 'no marketing consent on record' };
  if (campaign.audience === 'acquisition' && !(STAGES[s] && STAGES[s].acquisition)) return { ok: false, why: `stage ${s} excluded from acquisition` };
  if (campaign.audience === 'past_client' && s !== 'past_client') return { ok: false, why: 'not a past client' };
  if (lead.pausedUntil && lead.pausedUntil > Date.now()) return { ok: false, why: 'human handling' };
  return { ok: true };
}

// ---- followups.js ----
// Follow-up engine — ONE source of truth. lead-api tests run it in Node; the build script
// (scripts/build-followup-gs.mjs) compiles it with time.js + calendar.js into
// apps-script/FollowupEngine.gs so the Google Sheet runs the identical logic.
// Keep this file free of Node-only APIs and optional chaining (Apps Script V8 safe).

// Client rule (3 Nov 2026): automated follow-ups go out only 10:00–19:00 IST, studio hours.
const FU_SEND_WINDOW = { startMin: 10 * 60, endMin: 19 * 60 };

// kind: session  = free-form inside WhatsApp's 24-h window (or Instagram's 24-h window)
//       template = approved WhatsApp template (category below); WhatsApp only
//       task     = a job for the desk (call, send 3D, proposal) — appears in "Next step"
//       move     = the engine moves the lead to another stage
const CADENCE = {
  new: [
    // Standard 7-touch cadence (client brief, 3 Nov 2026): 30 min · 3 h · 1 d · 3 d · 7 d · 14 d · 21 d.
    // A reply from the lead restarts it (RESET_ON_REPLY). Sends only inside FU_SEND_WINDOW, never on quiet days.
    { key: 'nudge_30m', after: 30 * MIN, kind: 'session', tpl: 's_nudge' },
    { key: 'nudge_3h', after: 3 * HOUR, kind: 'session', tpl: 's_guide' },
    { key: 'ig_last', after: 22 * HOUR, kind: 'task', channel: 'ig', task: 'Instagram last-chance before the 24-h window closes: send s_ig_lastchance and ask for a WhatsApp number' },
    { key: 'd1', after: 1 * DAY, kind: 'template', tpl: 'eh_fu_d1_guide', category: 'marketing' },
    { key: 'd3', after: 3 * DAY, kind: 'template', tpl: 'eh_fu_d3_proof', category: 'marketing' },
    { key: 'd7', after: 7 * DAY, kind: 'template', tpl: 'eh_fu_d7_muhurat', category: 'marketing' },
    { key: 'd14', after: 14 * DAY, kind: 'template', tpl: 'eh_fu_d14_checkin', category: 'marketing' },
    { key: 'd21', after: 21 * DAY, kind: 'template', tpl: 'eh_fu_d21_close', category: 'marketing' },
    { key: 'to_nurture', after: 22 * DAY, kind: 'move', to: 'nurture' },
  ],
  qualified: [
    { key: 'call_task', after: 0, kind: 'task', task: 'Designer call within 24 h — offer two studio slots' },
    { key: 'nudge_3h', after: 3 * HOUR, kind: 'session', tpl: 's_guide' },
    { key: 'd1', after: 1 * DAY, kind: 'template', tpl: 'eh_q_slots', category: 'marketing' },
    { key: 'd3', after: 3 * DAY, kind: 'template', tpl: 'eh_fu_d3_proof', category: 'marketing' },
    { key: 'd7', after: 7 * DAY, kind: 'template', tpl: 'eh_fu_d7_muhurat', category: 'marketing' },
    { key: 'd14', after: 14 * DAY, kind: 'template', tpl: 'eh_fu_d14_checkin', category: 'marketing' },
    { key: 'd21', after: 21 * DAY, kind: 'template', tpl: 'eh_fu_d21_close', category: 'marketing' },
    { key: 'to_nurture', after: 22 * DAY, kind: 'move', to: 'nurture' },
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

const STAGE_SEQ = {
  new: 'new', qualifying: 'new', qualified: 'qualified', nurture: 'nurture', visit_booked: 'booked',
  no_show: 'no_show', walked_in: 'walked_in', proposal: 'proposal', signed: 'signed',
};
// A reply from the lead restarts these sequences from the reply time.
const RESET_ON_REPLY = ['new', 'qualified', 'nurture'];
// Steps that still run while a person is handling the chat (human pause).
const RUNS_DURING_PAUSE = ['booked'];

/** Move a due time out of quiet days and outside the IST send window. */
function adjustDue(ts) {
  let t = ts;
  for (let i = 0; i < 5; i++) {
    const d = ist(t);
    if (QUIET_DAYS.indexOf(d.ymd) >= 0) { t = istAt(addDaysYmd(d.ymd, 1), 10, 0); continue; }
    if (d.minOfDay < FU_SEND_WINDOW.startMin) { t = istAt(d.ymd, 10, 0); continue; }
    if (d.minOfDay > FU_SEND_WINDOW.endMin) { t = istAt(addDaysYmd(d.ymd, 1), 10, 0); continue; }
    break;
  }
  return t;
}

/** Bring the lead's sequence state up to date (call before planNext). Pure. */
function refreshAnchor(lead) {
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
function planNext(lead, now) {
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
