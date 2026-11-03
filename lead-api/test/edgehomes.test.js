// EasySocial wiring: LIVE topic blocks, the AI concierge GET, campaign push preview and the cURL filler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import concierge from '../api/es/concierge.js';
import push from '../api/es/campaign-push.js';
import { parseCurl, fillRequest } from '../lib/curl.js';
import { filterList, firstName } from '../lib/contacts.js';
import { findCampaign } from '../lib/campaign-registry.js';

const res = () => ({ statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } });
process.env.CONCIERGE_KEY = 'ck'; process.env.CAMPAIGN_PUSH_KEY = 'pk'; delete process.env.SHEET_LOG_URL; delete process.env.ANTHROPIC_API_KEY;

test('LIVE topic blocks answer from the calendar with no AI', async () => {
  for (const intent of ['greeting', 'offer', 'price', 'timings', 'location', 'services', 'process', 'pooja_room', 'feature_wall', 'construction']) {
    const r = res();
    await concierge({ method: 'GET', headers: {}, query: { key: 'ck', intent, message: '[last_message]', platform: 'whatsapp' } }, r);
    const j = JSON.parse(r.body);
    assert.equal(r.statusCode, 200, intent); assert.equal(j.intent, intent); assert.ok(j.reply.length > 10, intent);
  }
  const t = res();
  await concierge({ method: 'GET', headers: {}, query: { key: 'ck', intent: 'timings', format: 'text' } }, t);
  assert.match(t.body, /Mon–Sat 10 AM – 7 PM/);
});

test('STOP inside a topic block still opts out', async () => {
  const r = res();
  await concierge({ method: 'GET', headers: {}, query: { key: 'ck', intent: 'offer', message: 'STOP' } }, r);
  assert.equal(JSON.parse(r.body).set_stage, 'opted_out');
});

test('AI concierge block (no intent) classifies the message; bad key refused', async () => {
  const r = res();
  await concierge({ method: 'GET', headers: {}, query: { key: 'ck', message: 'mandir design chahiye', name: 'Neha Sharma', platform: 'instagram' } }, r);
  const j = JSON.parse(r.body);
  assert.equal(j.intent, 'pooja_room'); assert.match(j.reply, /Pooja room|pooja/i);
  const bad = res();
  await concierge({ method: 'GET', headers: {}, query: { key: 'nope', message: 'hi' } }, bad);
  assert.equal(bad.statusCode, 401);
});

test('campaign push previews with reasons and never sends without all three live switches', async () => {
  const contacts = [
    { phone: '9871522556', name: 'Studio', consent: true, group: 'B', stage: 'past_client' },
    { phone: '9811111111', name: 'Neha Sharma (2021)', consent: true, group: 'B', stage: 'past_client' },
    { phone: '9811111111', name: 'dup', consent: true, group: 'B' },
    { phone: '9822222222', name: 'Amit', consent: false, group: 'B', stage: 'past_client' },
    { phone: '9833333333', name: 'Ravi', consent: true, group: 'F' },
    { phone: '123', name: 'x' },
    { phone: '9844444444', name: 'Opted', consent: true, stage: 'opted_out', group: 'B' },
  ];
  const r = res();
  await push({ method: 'POST', headers: { 'x-api-key': 'pk' }, body: { campaign: 'referral', contacts, live: true, confirm: 'referral_dec26' } }, r, { fetchImpl: () => { throw new Error('must not send'); } });
  const j = JSON.parse(r.body);
  assert.equal(j.preview, true); assert.equal(j.eligible, 1); assert.equal(j.sample[0].name, 'Neha');
  assert.equal(j.reasons["Edgehomes' own number"], 1); assert.equal(j.reasons['duplicate in list'], 1);
  assert.equal(j.reasons['no recorded consent'], 1); assert.equal(j.reasons['consent source unknown (group F)'], 1);
});

test('cURL from an API campaign is filled per contact', () => {
  const req = parseCurl(`curl -X POST 'https://api.example.com/campaign/abc/send' -H 'Authorization: Bearer T' -H 'Content-Type: application/json' --data '{"phone_number":"919999999999","name":"Rohit","variables":["{{1}}"]}'`);
  assert.equal(req.method, 'POST'); assert.equal(req.headers.authorization, 'Bearer T');
  const f = fillRequest(req, { phone: '919811111111', name: 'Neha', vars: ['Neha'] });
  assert.equal(f.body.phone_number, '919811111111'); assert.equal(f.body.name, 'Neha'); assert.deepEqual(f.body.variables, ['Neha']);
});

test('names and campaigns', () => {
  assert.equal(firstName('mr'), 'there'); assert.equal(firstName('PRIYA verma'), 'Priya');
  assert.equal(findCampaign('past clients').id, 'referral_dec26');
  const ended = filterList([{ phone: '9811111111', consent: true, group: 'B', stage: 'past_client' }], findCampaign('diwali'), new Set(), Date.parse('2026-12-01T06:00:00Z'));
  assert.equal(ended.keep.length, 0);
});
