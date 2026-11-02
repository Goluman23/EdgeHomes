import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLead } from '../api/lead.js';
import { extractEvents } from '../api/es/webhook.js';
import webhook from '../api/es/webhook.js';
import followupSend from '../api/es/followup-send.js';
import followupSync from '../api/es/followup-sync.js';

function mockRes() {
  return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b || ''; } };
}

test('lead intake: normalises, scores and builds a tagged WhatsApp link', () => {
  const l = buildLead({ name: 'Neha', phone: '98715 22556', city: 'faridabad', possession: 'Keys in hand', budget: '8-15', source: 'meta_form', consent: true });
  assert.equal(l.phone, '919871522556'); assert.equal(l.qualified, true); assert.equal(l.stage, 'qualified');
  assert.equal(l.source, 'SRC_META_FORM'); assert.equal(l.consent, true);
  assert.match(decodeURIComponent(l.wa), /EH-FORM-FBD/);
  assert.ok(buildLead({ phone: '123' }).error);
});

test('webhook: verification and Meta payload extraction with ad referral', async () => {
  process.env.ES_WEBHOOK_VERIFY_TOKEN = 'tok';
  const res = mockRes();
  await webhook({ method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'tok', 'hub.challenge': '42' }, headers: {} }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body, '42');
  const ev = extractEvents({ entry: [{ changes: [{ value: {
    contacts: [{ wa_id: '919871522556', profile: { name: 'Neha' } }],
    messages: [{ from: '919871522556', id: 'm1', timestamp: '1793000000', type: 'text', text: { body: 'Hi EH-META-NOI' }, referral: { source_id: 'ad1', ctwa_clid: 'c' } }],
  } }] }] });
  assert.equal(ev[0].phone, '919871522556'); assert.equal(ev[0].name, 'Neha'); assert.equal(ev[0].referral.source_id, 'ad1');
});

test('follow-up send and sync stay in DRY RUN until FOLLOWUP_LIVE=1', async () => {
  process.env.SHEET_LOG_SECRET = 's3cret'; delete process.env.FOLLOWUP_LIVE;
  const r1 = mockRes();
  await followupSend({ method: 'POST', headers: {}, body: { secret: 's3cret', phone: '9871522556', tpl: 'eh_fu_d1_guide', vars: ['Neha', 'Noida'] } }, r1);
  const b1 = JSON.parse(r1.body); assert.equal(b1.dryRun, true); assert.equal(b1.wouldSend.phone, '919871522556');
  const r2 = mockRes();
  await followupSync({ method: 'POST', headers: {}, body: { secret: 's3cret', phone: '9871522556', stage: 'opted_out' } }, r2);
  const b2 = JSON.parse(r2.body); assert.equal(b2.dryRun, true); assert.deepEqual(b2.plan.add, ['SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING']);
  const r3 = mockRes();
  await followupSend({ method: 'POST', headers: {}, body: { secret: 'wrong', tpl: 'x' } }, r3);
  assert.equal(r3.statusCode, 401);
  const r4 = mockRes();
  await followupSend({ method: 'POST', headers: {}, body: { secret: 's3cret', channel: 'ig', tpl: 'eh_fu_d1_guide' } }, r4);
  assert.equal(r4.statusCode, 422);
});
