// Dry-run QA for the follow-up engine (the same code runs in the Google Sheet).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planNext, refreshAnchor, adjustDue } from '../lib/followups.js';
import { istAt, ist, MIN, HOUR, DAY } from '../lib/time.js';

const T0 = istAt('2026-11-02', 11, 0); // Mon 2 Nov, 11:00 IST
const fresh = o => { const { sent = [], ...rest } = o; return { ...refreshAnchor({ sent: [], ...rest }), sent: [...sent] }; };
const base = (o = {}) => fresh({ stage: 'new', stageChangedAt: T0, lastInboundAt: T0, channel: 'wa', consent: true, ...o });
function run(lead, from, to, step = 10 * MIN) {
  const log = []; let l = { ...lead, sent: [...lead.sent] };
  for (let t = from; t <= to; t += step) {
    const p = planNext(l, t);
    if (['send', 'task', 'skip', 'move'].includes(p.action)) { l.sent.push(p.step.key); log.push({ t, a: p.action, k: p.step.key, why: p.reason }); if (p.action === 'move') break; }
  }
  return log;
}

test('QA-01 new lead, no reply: 30 min, 3 h, day 1, 3, 7, 14, 21, then nurture — all inside 10:00–19:00 IST', () => {
  const log = run(base(), T0, T0 + 23 * DAY);
  assert.deepEqual(log.map(x => x.k), ['nudge_30m', 'nudge_3h', 'd1', 'd3', 'd7', 'd14', 'd21', 'to_nurture']);
  assert.equal(log[0].t - T0, 30 * MIN);
  assert.ok(log.every(x => ist(x.t).ymd !== '2026-11-08'), 'nothing on Diwali');
  assert.ok(log.filter(x => x.a === 'send').every(x => { const m = ist(x.t).minOfDay; return m >= 600 && m <= 1140; }), 'sends only 10:00–19:00');
});

test('QA-01b drop-off at 6:50 PM: the 30-min nudge waits for 10 AM next day', () => {
  const late = istAt('2026-11-02', 18, 50);
  const p = planNext(fresh({ stage: 'new', stageChangedAt: late, lastInboundAt: late, channel: 'wa', consent: true }), late + 31 * MIN);
  assert.equal(p.action, 'wait'); assert.equal(ist(p.dueAt).hh, 10); assert.equal(ist(p.dueAt).ymd, '2026-11-03');
});

test('QA-02 a reply restarts the sequence from the reply', () => {
  const l = base({ sent: ['nudge_30m', 'nudge_3h'], seq: 'new', anchorAt: T0 });
  const r = refreshAnchor({ ...l, lastInboundAt: T0 + 5 * HOUR });
  assert.deepEqual(r.sent, []); assert.equal(r.anchorAt, T0 + 5 * HOUR);
});

test('QA-03 session messages are skipped once the 24-h window has closed', () => {
  const l = base({ lastInboundAt: T0 - 2 * DAY, stageChangedAt: T0 - 2 * DAY });
  const p = planNext(refreshAnchor({ ...l, lastInboundAt: T0 - 2 * DAY }), T0);
  assert.equal(p.action, 'skip'); assert.match(p.reason, /24-h window/);
});

test('QA-04 no marketing consent → marketing templates skipped, utility still sent', () => {
  const l = base({ consent: false, sent: ['nudge_30m', 'nudge_3h'] });
  assert.equal(planNext(l, T0 + DAY + HOUR).reason, 'no marketing consent');
  const b = refreshAnchor({ stage: 'visit_booked', stageChangedAt: T0, visitAt: istAt('2026-11-04', 11), channel: 'wa', consent: false, sent: [] });
  assert.equal(planNext(b, T0).action, 'send');
});

test('QA-05 visit booked: confirm now, 7 PM the evening before, 2 h before, then outcome task', () => {
  const visit = istAt('2026-11-04', 11, 0);
  const l = refreshAnchor({ stage: 'visit_booked', stageChangedAt: T0, visitAt: visit, channel: 'wa', consent: true, sent: [] });
  const log = run(l, T0, visit + 2 * HOUR);
  assert.deepEqual(log.map(x => x.k), ['confirm', 'eve', 'h2', 'outcome']);
  assert.equal(ist(log[1].t).ymd, '2026-11-03'); assert.equal(ist(log[1].t).hh, 19);
  assert.equal(log[3].a, 'task');
});

test('QA-06 booking suppresses acquisition nudges', () => {
  const l = refreshAnchor({ stage: 'visit_booked', seq: 'new', sent: ['nudge_30m'], stageChangedAt: T0, visitAt: T0 + 3 * DAY, channel: 'wa', consent: true });
  assert.equal(l.seq, 'booked'); assert.deepEqual(l.sent, []);
  assert.equal(planNext(l, T0).step.key, 'confirm');
});

test('QA-07 human pause stops acquisition follow-ups but not visit reminders', () => {
  const p1 = planNext(base({ pausedUntil: T0 + 48 * HOUR }), T0 + HOUR);
  assert.equal(p1.action, 'wait'); assert.equal(p1.reason, 'human handling');
  const b = refreshAnchor({ stage: 'visit_booked', stageChangedAt: T0, visitAt: T0 + DAY, pausedUntil: T0 + 48 * HOUR, channel: 'wa', sent: [] });
  assert.equal(planNext(b, T0).action, 'send');
});

test('QA-08 signed / client / opted out: no acquisition sequence', () => {
  for (const stage of ['client', 'past_client', 'opted_out', 'lost', 'not_lead']) {
    assert.equal(planNext(refreshAnchor({ stage, stageChangedAt: T0, sent: [] }), T0 + DAY).action, 'done', stage);
  }
  const s = refreshAnchor({ stage: 'signed', stageChangedAt: T0, channel: 'wa', sent: [] });
  assert.equal(planNext(s, T0).step.tpl, 'eh_welcome_signed');
});

test('QA-09 no-show: rebook call task at +30 min, one template next day, then nurture', () => {
  const l = refreshAnchor({ stage: 'no_show', stageChangedAt: T0, lastInboundAt: T0 - DAY, channel: 'wa', consent: true, sent: [] });
  const log = run(l, T0, T0 + 5 * DAY);
  assert.deepEqual(log.map(x => x.k), ['rebook_call', 'rebook_d1', 'to_nurture']);
});

test('QA-10 walked in: 3D same day, proposal 48 h, founder day 3, ask-why day 5', () => {
  const l = refreshAnchor({ stage: 'walked_in', stageChangedAt: T0, channel: 'wa', consent: true, sent: [] });
  const log = run(l, T0, T0 + 6 * DAY);
  assert.deepEqual(log.map(x => `${x.a}:${x.k}`), ['task:send_3d', 'task:proposal', 'task:founder', 'send:ask_why']);
});

test('QA-11 Instagram lead: templates become desk tasks inside 7 days, skipped after', () => {
  const l = base({ channel: 'ig', sent: ['nudge_30m', 'nudge_3h', 'ig_last'] });
  assert.equal(planNext(l, T0 + DAY + HOUR).action, 'task');
  const old = fresh({ ...l, lastInboundAt: T0 - 8 * DAY, stageChangedAt: T0 - 8 * DAY, anchorAt: 0, seq: undefined });
  const p = planNext({ ...old, sent: ['nudge_30m', 'nudge_3h', 'ig_last', 'd1', 'd3'] }, T0);
  assert.equal(p.action, 'skip');
});

test('QA-12 quiet hours and Diwali move sends to the next allowed slot', () => {
  assert.equal(ist(adjustDue(istAt('2026-11-02', 22, 0))).hh, 10);
  assert.equal(ist(adjustDue(istAt('2026-11-02', 19, 30))).ymd, '2026-11-03');
  const d = ist(adjustDue(istAt('2026-11-08', 12, 0)));
  assert.equal(d.ymd, '2026-11-09'); assert.equal(d.hh, 10);
});

test('QA-13 reminders whose moment passed are skipped, not sent late', () => {
  const visit = T0 + 3 * HOUR;
  const l = fresh({ stage: 'visit_booked', stageChangedAt: T0, visitAt: visit, channel: 'wa', sent: ['confirm'] });
  assert.equal(planNext(l, T0 + 10 * MIN).action, 'skip'); // eve-before already past
});
