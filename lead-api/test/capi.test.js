// Meta Conversions API: payload shape, hashing, de-dup id, and no-op without credentials.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEvent, sendCapi, sha256, fbcFrom, STAGE_EVENTS } from '../lib/capi.js';

test('CAPI Lead event hashes PII, keeps event_id and browser context', () => {
  const e = buildEvent({ name: 'Lead', eventId: 'ev-123', time: 1_800_000_000_000,
    lead: { phone: '919871522556', name: 'Neha Sharma', city: 'Greater Faridabad', email: 'N@x.com' },
    ctx: { ip: '1.2.3.4', ua: 'UA', url: 'https://edgehomesarchitects.in/', fbp: 'fb.1.1.2', fbclid: 'abc' } });
  assert.equal(e.event_name, 'Lead'); assert.equal(e.event_id, 'ev-123'); assert.equal(e.action_source, 'website');
  assert.equal(e.user_data.ph[0], sha256('919871522556')); assert.equal(e.user_data.em[0], sha256('n@x.com'));
  assert.equal(e.user_data.fn[0], sha256('neha')); assert.equal(e.user_data.ct[0], sha256('greaterfaridabad'));
  assert.equal(e.user_data.fbc, 'fb.1.1800000000000.abc'); assert.equal(e.user_data.client_ip_address, '1.2.3.4');
  assert.ok(!JSON.stringify(e).includes('9871522556'), 'no raw phone in payload');
});

test('CAPI is a no-op without credentials and posts to the dataset with them', async () => {
  delete process.env.META_PIXEL_ID; delete process.env.META_CAPI_TOKEN;
  assert.match((await sendCapi([{}])).skipped, /not set/);
  process.env.META_PIXEL_ID = '123'; process.env.META_CAPI_TOKEN = 'tok'; process.env.META_TEST_EVENT_CODE = 'TEST1';
  let seen;
  const r = await sendCapi([{ event_name: 'Lead' }], { fetchImpl: async (u, o) => { seen = { u, b: JSON.parse(o.body) }; return { ok: true, status: 200, json: async () => ({ events_received: 1 }) }; } });
  assert.ok(r.ok); assert.match(seen.u, /graph\.facebook\.com\/v\d+\.\d+\/123\/events\?access_token=tok/);
  assert.equal(seen.b.test_event_code, 'TEST1'); assert.equal(seen.b.data[0].event_name, 'Lead');
  delete process.env.META_PIXEL_ID; delete process.env.META_CAPI_TOKEN; delete process.env.META_TEST_EVENT_CODE;
});

test('stage feedback map and fbc passthrough', () => {
  assert.equal(STAGE_EVENTS.visit_booked, 'Schedule'); assert.equal(STAGE_EVENTS.signed, 'Purchase');
  assert.equal(fbcFrom({ fbc: 'fb.1.9.x', fbclid: 'y' }), 'fb.1.9.x'); assert.equal(fbcFrom({}), undefined);
});
