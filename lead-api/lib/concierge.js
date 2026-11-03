// Fast rules -> Claude -> safe fallback. Every message gets a relevant reply or a person.
import { classify } from './intent.js';
import { reply } from './replies.js';
import { askClaude } from './claude.js';

// Fixed topics for EasySocial LIVE blocks (?intent=): answered from the calendar, never by AI.
export const TOPICS = ['greeting', 'offer', 'price', 'timings', 'location', 'services', 'process', 'pooja_room',
  'feature_wall', 'construction', 'renovation', 'portfolio', 'contact', 'snag_check', 'visit_or_plan', 'call_request', 'human', 'timeline'];

export async function respond({ text, intent = '', stage = 'new', name = '', channel = 'wa', waitingForHuman = false, lastText = '', now = Date.now(), history = [], fetchImpl }) {
  const c = classify(text, { stage, waitingForHuman, lastText });
  // STOP always wins, even inside a topic block.
  const useTopic = intent && c.intent !== 'stop' && c.intent !== 'silent_opted_out';
  const chosen = useTopic ? intent : c.intent;
  let r = reply(chosen, { name, lang: c.lang, now, stage });
  let source = useTopic ? 'topic' : 'rules';
  if (!useTopic && chosen === 'unknown') {
    const ai = await askClaude({ text, stage, history, now, fetchImpl });
    if (ai) { r = ai; source = 'claude'; }
  }
  if (!r) r = reply('unknown', { name, lang: c.lang, now, stage });
  if (channel === 'ig' && chosen === 'call_request') {
    r = { ...r, text: `${r.text}\n${c.lang === 'hi' ? 'Aapka mobile number?' : "What's the best number to reach you on?"}`, askPhone: true };
  }
  return { intent: chosen, lang: c.lang, source, handoff: !!(r.handoff || (!useTopic && c.handoff)), ...r };
}
