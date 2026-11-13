// Every message heard: each simulator case must map to an intent with a non-empty reply.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../lib/intent.js';
import { reply } from '../lib/replies.js';
import { respond } from '../lib/concierge.js';
import { passesGuard } from '../lib/claude.js';
import { istAt } from '../lib/time.js';

const DAY = istAt('2026-11-02', 11), NIGHT = istAt('2026-11-02', 23, 30);
const CASES = [
  ['hi', 'greeting'], ['👋', 'greeting'], ['anyone available for a quick call?', 'call_request'],
  ['available?', 'availability'], ['anyone available to talk on call?', 'call_request'], ['anyone available?', 'availability'],
  ['can someone call me?', 'call_request'], ['I want to talk to a human', 'human'], ['koi insaan hai? kisi se baat karni hai', 'human'],
  ['connect me to your manager', 'human'], ['are you a bot?', 'bot_question'], ['phone number?', 'contact'], ['location?', 'location'],
  ['office kahan hai?', 'location'], ['are you open on sunday?', 'timings'], ['how long will it take?', 'timeline'],
  ['EMI available?', 'payment_terms'], ['what about warranty?', 'warranty'], ['do you do painting?', 'service_question'],
  ['brochure please', 'profile'], ['show me your past work', 'portfolio'], ['my friend referred you', 'referral'], ['wrong number', 'wrong_number'],
  ['👍', 'yes'], ['ok', 'yes'], ['2', 'number_pick'], ['no', 'no'], ['❤️🔥', 'love'], ['😡', 'angry'], ['🤔', 'emoji_unclear'],
  ['thanks', 'thanks'], ['bye', 'bye'], ['this is useless, fraud company', 'angry'], ['STOP', 'stop'],
  ['price?', 'price'], ['3bhk ka kitna lagega', 'price'], ['best price if I sign today?', 'discount'],
  ['can we remove a wall', 'structural'], ['only need a wardrobe', 'small_scope'], ['flat in Jaipur', 'out_of_area'],
  ['hiring?', 'job'], ['pooja room vastu', 'pooja_room'], ['vastu tips?', 'vastu'], ['mirror mosaic wall', 'feature_wall'], ['renovation of old flat', 'renovation'], ['we are a developer', 'developer'], ['any offer?', 'offer'], ['what services do you offer', 'services'], ['how does it work', 'process'], ['do you do construction', 'construction'], ['I have a 200 gaj plot', 'construction'], ['free snag check?', 'snag_check'],
  ['can I book a visit', 'visit_or_plan'], ['9871522556', 'phone_shared'], ['asdf', 'unknown'],
];

test('every listener case gets the right intent and a reply', () => {
  for (const [text, intent] of CASES) {
    const c = classify(text, {});
    assert.equal(c.intent, intent, `"${text}" → ${c.intent}, expected ${intent}`);
    if (intent === 'unknown') continue;
    const r = reply(c.intent, { now: DAY, lang: c.lang });
    assert.ok(r && typeof r.text === 'string' && r.text.length > 0, `no reply for "${text}"`);
  }
});

test('waiting for a person: "hello??" escalates, other text is noted', () => {
  assert.equal(classify('hello??', { waitingForHuman: true }).intent, 'chase');
  assert.equal(classify('also need a study table', { waitingForHuman: true }).intent, 'note_for_human');
  assert.equal(classify('price?', { lastText: 'price?' }).intent, 'repeat');
});

test('opted-out contacts: silent unless they greet first', () => {
  assert.equal(classify('price?', { stage: 'opted_out' }).intent, 'silent_opted_out');
  assert.equal(classify('hi', { stage: 'opted_out' }).intent, 'resubscribe');
});

test('call requests: offer a call now in hours, call-back slots at night', () => {
  assert.match(reply('call_request', { now: DAY }).text, /10 minutes/);
  assert.deepEqual(reply('call_request', { now: NIGHT }).buttons, ['Tomorrow 10 AM', 'Tomorrow 12 PM', 'Tomorrow 6 PM']);
  assert.equal(reply('call_request', { now: DAY }).handoff, true);
});

test('greeting depends on the contact status', () => {
  assert.match(reply('greeting', { stage: 'new', now: DAY }).text, /drawn & built as one/);
  assert.match(reply('greeting', { stage: 'qualifying', now: DAY }).text, /Welcome back/);
  assert.match(reply('greeting', { stage: 'visit_booked', now: DAY }).text, /booked/);
  assert.equal(reply('greeting', { stage: 'client', now: DAY }).handoff, true);
});

test('location never invents an address while it is unconfirmed', () => {
  const r = reply('location', { now: DAY });
  assert.match(r.text, /Omaxe World Street, Sector 79/); assert.match(r.text, /maps.google.com/); assert.doesNotMatch(r.text, /exact pin/);
  assert.ok(!(r.tags || []).includes('NEEDS_ADDRESS'));
});

test('price reply quotes bands only', () => {
  const r = reply('price', { now: DAY });
  assert.match(r.text, /₹10–15 lakh/);
  assert.ok(passesGuard(r.text));
});

test('Claude guard blocks invented prices and booking claims', () => {
  assert.equal(passesGuard('Your 3 BHK will cost ₹12,40,000.'), false);
  assert.equal(passesGuard('Your visit is confirmed for Saturday.'), false);
  assert.equal(passesGuard('3 BHK turnkey is usually ₹10–15 lakh. Want a 3D session?'), true);
});

test('concierge: unknown text falls back safely when Claude is unavailable', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = await respond({ text: 'asdf qwerty', now: DAY });
  assert.equal(r.intent, 'unknown'); assert.ok(r.text.length > 0); assert.ok(r.buttons.length > 0);
});

test('concierge: Claude answer is used when it passes the guard', async () => {
  process.env.ANTHROPIC_API_KEY = 'test';
  const fake = async () => ({ ok: true, json: async () => ({ content: [{ text: '{"reply":"Yes, we design home offices too. Want a 3D session?","intent":"home_office","handoff":false}' }] }) });
  const r = await respond({ text: 'do you guys like cats', now: DAY, fetchImpl: fake });
  assert.equal(r.source, 'claude'); assert.match(r.text, /home offices/);
  const bad = async () => ({ ok: true, json: async () => ({ content: [{ text: '{"reply":"It will be ₹9,99,999 exactly","intent":"price","handoff":false}' }] }) });
  const r2 = await respond({ text: 'zzzz something odd', now: DAY, fetchImpl: bad });
  assert.equal(r2.source, 'rules');
  delete process.env.ANTHROPIC_API_KEY;
});

test('Instagram call request asks for a number', async () => {
  const r = await respond({ text: 'anyone available for a quick call?', channel: 'ig', now: DAY });
  assert.equal(r.askPhone, true);
});

test('guide request sends the hosted 2026 cost guide', () => {
  assert.equal(classify('send the guide').intent, 'guide');
  assert.equal(classify('Yes, send it').intent, 'guide');
  const r = reply('guide', { now: DAY });
  assert.match(r.text, /edgehomesarchitects\.in\/guide\/2026-cost-guide/);
  assert.match(r.text, /T&C/);
});

test('REFER explains the 1% referral reward and hands to a person', () => {
  assert.equal(classify('REFER').intent, 'refer_program');
  const r = reply('refer_program', { now: DAY });
  assert.match(r.text, /1% of their total project value/);
  assert.equal(r.handoff, true);
});

test('profile / brochure request sends the hosted Studio Profile', () => {
  assert.equal(classify('send your studio profile').intent, 'profile');
  assert.equal(classify('brochure').intent, 'profile');
  assert.match(reply('profile', { now: DAY }).text, /edgehomesarchitects\.in\/studio-profile\.pdf/);
});
