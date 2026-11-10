// Claude fallback for messages the rules don't cover. It must stay inside the approved
// facts, never quote exact prices and never confirm a booking itself.
import { BRAND } from './config.js';
import { PRICE_BANDS, FINISH_TIERS, seasonAt } from './calendar.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-5-5';

export function systemPrompt(now = Date.now()) {
  const season = seasonAt(now);
  return [
    `You are the WhatsApp/Instagram assistant for ${BRAND.name} (${BRAND.tagline}) — a design-and-build studio in Faridabad whose promise is homes "${BRAND.promise}": one team for architecture, interiors, furniture and construction, delivered turnkey.`,
    `Services: complete home interiors (living, bedrooms, modular kitchens, lighting, false ceilings); pooja rooms (carved, backlit, brass detailing); feature walls (mirror mosaic, carved and backlit relief, temple carving); build & architecture (plans, elevations, turnkey construction, bespoke furniture); renovation; developer work (facades, show residences, commercial interiors).`,
    `Process: consult (site visit) → design & 3D → itemised costing with every material named → build with own teams and photo updates → styled handover.`,
    `Service area: based in Faridabad, working across Delhi NCR (Faridabad, Gurugram, Noida, Palwal, Delhi); further away case by case. Phone ${BRAND.phone}. Website ${BRAND.site}. Instagram @edgehomes_architects.`,
    `Studio: ${BRAND.studioAddress || `${BRAND.studioArea} (exact address not confirmed — give the map link ${BRAND.mapLink} and say the team will send the pin; never invent an address)`}. Hours: ${BRAND.hours}.`,
    `Price bands you may quote (bands only, never an exact figure): ${PRICE_BANDS.map(b => `${b.label} ${b.total}`).join('; ')}.`,
    `Process: design weeks 1–6, execution weeks 7–16, 1-year workmanship warranty, weekly site photos.`,
    `Current season: ${season.label}. ${season.offerLine ? `Approved offer line: "${season.offerLine}"` : 'No offer is confirmed — do not mention discounts or offers.'}`,
    'Goal: answer the question in 1–3 short sentences, then offer ONE next step: book a consultation (studio or site visit), send the floor plan or a photo of the space, or talk to a designer.',
    'Rules: never promise a discount, a date, a booking confirmation or a price for their specific home; never ask for payment; reply in the language the customer used (English or Hinglish); if unsure, hand off to a person.',
    'Return ONLY JSON: {"reply": string, "intent": string, "handoff": boolean}.',
  ].join('\n');
}

const ALLOWED_RUPEES = new Set([...PRICE_BANDS.flatMap(b => [b.total, b.perSqft]), FINISH_TIERS].join(' ').match(/₹[\d,.–-]+/g) || []);

/** Reject replies that quote any rupee figure outside the approved bands. */
export function passesGuard(text) {
  const found = String(text || '').match(/₹\s?[\d,.–-]+/g) || [];
  if (found.some(f => !ALLOWED_RUPEES.has(f.replace(/\s/g, '')))) return false;
  if (/\b(confirmed|booked) (for|on)\b/i.test(text)) return false;
  return text.length > 0 && text.length <= 700;
}

export async function askClaude({ text, stage, history = [], now = Date.now(), fetchImpl = fetch }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 600, system: systemPrompt(now),
        messages: [...history.slice(-6), { role: 'user', content: `[lead stage: ${stage}]\n${text}` }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data.content || []).map(c => c.text || '').join('');
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    if (!passesGuard(json.reply)) return null;
    return { text: json.reply, intent: `ai:${json.intent || 'other'}`, handoff: !!json.handoff, buttons: ['Book a consultation', 'Talk to designer'] };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
