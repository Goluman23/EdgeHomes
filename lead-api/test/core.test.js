import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from '../lib/phone.js';
import { parseSourceTag, resolveSource, mergeSource } from '../lib/source.js';
import { scoreLead } from '../lib/score.js';
import { canAutoMove, suppressionFor, suppressionDiff, eligibleFor } from '../lib/stages.js';
import { seasonAt, isQuietDay } from '../lib/calendar.js';
import { istAt } from '../lib/time.js';

test('phone normalisation is the identity key', () => {
  for (const v of ['9871522556', '+91 98715 22556', '09871522556', '919871522556', '0091-98715-22556'])
    assert.equal(normalizePhone(v), '919871522556');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('5871522556'), null);
});

test('source tags and click-to-WhatsApp referral', () => {
  assert.deepEqual(parseSourceTag('Hi! EH-META-FBD').tag, 'SRC_META_CTWA');
  assert.equal(parseSourceTag('hello eh-meta-ggn').city, 'Gurugram');
  assert.equal(parseSourceTag('EH-QR-BPTP77').detail, 'BPTP77');
  assert.equal(resolveSource({ text: 'hi', referral: { ctwa_clid: 'x', source_id: '123' } }).tag, 'SRC_META_CTWA');
  assert.equal(resolveSource({ text: 'hi', channel: 'ig' }).tag, 'SRC_IG_DM');
  const l = mergeSource(mergeSource({}, { tag: 'SRC_META_CTWA', city: 'Faridabad' }), { tag: 'SRC_GOOGLE' });
  assert.equal(l.firstSource, 'SRC_META_CTWA'); assert.equal(l.lastSource, 'SRC_GOOGLE'); assert.equal(l.city, 'Faridabad');
});

test('qualified = possession ≤ 6 months and budget ₹8 L+ (₹25 L+ for plots)', () => {
  assert.equal(scoreLead({ possession: 'Keys in hand', budget: '8-15', city: 'Noida' }).qualified, true);
  assert.equal(scoreLead({ possession: 'later', budget: '25+' }).qualified, false);
  assert.equal(scoreLead({ possession: 'keys', budget: '15-25', property: 'Plot to build' }).qualified, false);
  assert.equal(scoreLead({ possession: 'keys', budget: '25+', property: 'Plot to build' }).qualified, true);
  const s = scoreLead({ possession: 'keys', budget: '25+', city: 'Gurugram', floorPlan: true, fastAnswers: true });
  assert.equal(s.score, 95); assert.equal(s.tier, 'HOT');
});

test('stage rules: customers never fall back into acquisition; opt-out always wins', () => {
  assert.equal(canAutoMove('signed', 'qualifying'), false);
  assert.equal(canAutoMove('client', 'new'), false);
  assert.equal(canAutoMove('proposal', 'opted_out'), true);
  assert.equal(canAutoMove('opted_out', 'qualified'), false);
  assert.equal(canAutoMove('opted_out', 'new'), true);
  assert.equal(canAutoMove('visit_booked', 'qualifying'), false);
  assert.equal(canAutoMove('no_show', 'visit_booked'), true);
  assert.equal(canAutoMove('new', 'not_lead'), true);
  assert.equal(canAutoMove('proposal', 'lost'), true);
  assert.equal(canAutoMove('signed', 'lost'), false);
});

test('suppression tags per stage', () => {
  assert.deepEqual(suppressionFor('opted_out'), ['SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING']);
  assert.deepEqual(suppressionFor('signed'), ['SUPPRESS_CLIENT']);
  assert.ok(suppressionFor('visit_booked').includes('SUPPRESS_ACQUISITION'));
  assert.ok(suppressionFor('new', { pausedUntil: Date.now() + 1000 }).includes('SUPPRESS_HUMAN_PAUSE'));
  const d = suppressionDiff('qualified');
  assert.deepEqual(d.add, []); assert.equal(d.remove.length, 5);
});

test('broadcast eligibility', () => {
  const acq = { kind: 'marketing', audience: 'acquisition' };
  assert.equal(eligibleFor({ stage: 'qualified', consent: true }, acq).ok, true);
  assert.equal(eligibleFor({ stage: 'qualified', consent: false }, acq).ok, false);
  assert.equal(eligibleFor({ stage: 'signed', consent: true }, acq).ok, false);
  assert.equal(eligibleFor({ stage: 'opted_out', consent: true }, acq).ok, false);
  assert.equal(eligibleFor({ stage: 'past_client', consent: true }, { kind: 'marketing', audience: 'past_client' }).ok, true);
});

test('calendar', () => {
  assert.equal(seasonAt(istAt('2026-11-01', 12)).id, 'sprint');
  assert.equal(seasonAt(istAt('2026-11-20', 12)).id, 'muhurat');
  assert.equal(seasonAt(istAt('2027-03-01', 12)).id, 'evergreen');
  assert.equal(isQuietDay(istAt('2026-11-08', 15)), true);
});
