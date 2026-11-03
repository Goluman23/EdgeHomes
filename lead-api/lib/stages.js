// ONE lead, ONE stage. Customer status always overrides campaign status.
export const STAGES = {
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
export const STAGE_KEYS = Object.keys(STAGES);
export const LOST_REASONS = ['Price / budget', 'Timing — not ready yet', 'Chose another designer', 'Location / distance',
  'Scope too small', 'Possession delayed', 'Could not be contacted', 'Other'];

const CUSTOMER = new Set(['signed', 'client', 'past_client']);

/** Can the system (not the desk) move a lead from -> to? Desk edits are always accepted. */
export function canAutoMove(from, to) {
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
export function suppressionFor(stage, { pausedUntil = 0, now = Date.now() } = {}) {
  const tags = [];
  if (stage === 'opted_out') tags.push('SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING');
  if (stage === 'not_lead') tags.push('SUPPRESS_MARKETING');
  if (stage === 'signed' || stage === 'client') tags.push('SUPPRESS_CLIENT');
  if (stage === 'past_client') tags.push('SUPPRESS_ACQUISITION');
  if (['visit_booked', 'walked_in', 'proposal'].includes(stage)) tags.push('SUPPRESS_ACQUISITION');
  if (pausedUntil && pausedUntil > now) tags.push('SUPPRESS_HUMAN_PAUSE');
  return tags;
}
export const ALL_SUPPRESS = ['SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING', 'SUPPRESS_CLIENT', 'SUPPRESS_ACQUISITION', 'SUPPRESS_HUMAN_PAUSE'];

/** Tag diff to send to EasySocial / ManyChat. */
export function suppressionDiff(stage, opts) {
  const want = new Set(suppressionFor(stage, opts));
  return { add: [...want], remove: ALL_SUPPRESS.filter(t => !want.has(t)) };
}

/** Is this broadcast/campaign allowed for this lead right now? */
export function eligibleFor(lead, campaign) {
  const s = lead.stage;
  if (s === 'opted_out' || s === 'not_lead') return { ok: false, why: 'suppressed' };
  if (campaign.kind === 'marketing' && lead.consent !== true) return { ok: false, why: 'no marketing consent on record' };
  if (campaign.audience === 'acquisition' && !(STAGES[s] && STAGES[s].acquisition)) return { ok: false, why: `stage ${s} excluded from acquisition` };
  if (campaign.audience === 'past_client' && s !== 'past_client') return { ok: false, why: 'not a past client' };
  if (lead.pausedUntil && lead.pausedUntil > Date.now()) return { ok: false, why: 'human handling' };
  return { ok: true };
}
