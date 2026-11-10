// Universal listener: every inbound text gets an intent. Ported from the flow simulator
// (edgehomes-flow-simulator.html) so the live bot and the simulator behave the same.
export const R = {
  stop: /^\s*(stop|unsubscribe|don'?t message( me)?|band karo|mat bhejo)\s*[.!]*\s*$/i,
  call: /\b(call|calling|ring me|phone me|phone kar|call kar|callback|call back|on (a )?call|quick call|talk on (the )?phone|baat ho sakti|baat kar sakte|phone pe)\b/i,
  notcall: /\b(called you|i will call|i'?ll call|missed call)\b/i,
  human: /\b(human|real person|actual person|live person|agent|executive|representative|someone from (your|the) team|speak (to|with) (someone|somebody|a person|your team)|talk (to|with) (someone|somebody|a person|you guys|your team|a human)|available to (talk|chat|speak)|connect me|manager|owner|founder|not a bot|stop (the )?bot|insaan|koi (insaan|banda|aadmi)|kisi se baat|customer care|support team|baat karni hai)\b/i,
  avail: /^\s*(available|avail|any ?one available|any ?one (there|here|online)|anybody (there|available|online)|is any ?one (there|available|online)|someone (there|available)|are you there|u there|you there|koi hai|online( ho)?|anyone)\s*\?*\s*$/i,
  chase: /^\s*(\?+|hello+\s*\?+|hi+\s*\?+|hey+\s*\?+|anyone\s*\?+|koi hai\s*\?+|reply\s*\?*|plz reply|please reply)\s*$/i,
  contact: /^\W*(contact|contacts|contact us|contact no\.?|contact number|contact details|number|no\.?|phone|phone no\.?|phone number|mobile|mobile no\.?|mobile number|whats ?app|whatsapp no\.?|whatsapp number|sampark|aapka number|apka number|number do|number dijiye|number kya hai|number bhejo|call number)\W*$|\b(phone|contact|mobile|whats ?app|cell)\s*(no|number|num|nmbr|details|nbr)\b|\byour (number|no\.?)\b|\bnumber (do|de|dijiye|please|pls|share)\b|\bemail( id| address)?\b|\bmail id\b/i,
  loc: /\b(location|locate|address|where (are|is) (you|your|the)|directions?|google map|map link|kahan (hai|ho)|kaha hai|kidhar|reach you|studio kahan|office kahan|pata|address kya hai|kahan pe|kaha pe|office address|studio address)\b/i,
  open: /\b(timings?|working hours|opening hours|closing time|close at|open (today|now|on|tomorrow)|are you open|sunday|kab tak khula|kab khulta)\b/i,
  bot: /\b(are you|is this|r u|you are|you r) (a |an )?(bot|robot|ai|machine|automated|computer|real)\b|\bbot hai\b|\bis this automated\b/i,
  timeline: /how (long|much time|many (days|weeks|months))|kitne din|kitna time|time lagega|duration|when can (i|we) (move|shift)|kab tak ho jaayega/i,
  emi: /\b(emi|loan|finance|financing|instal+ments?|payment (plan|terms|schedule)|advance (kitna|amount|payment))\b/i,
  warr: /\b(warranty|guarantee|after.?sales|servicing)\b/i,
  svc: /\b(painting|paint|false ceiling|pop|ceiling|modular kitchen|kitchen only|furniture|sofa|construction|renovat\w*|tiles|flooring|lighting|electrical|plumbing)\b/i,
  port: /\b(brochure|catalog(ue)?|portfolio|photos|pictures|pics|previous work|past work|your projects|samples?|work done|designs? you)\b/i,
  ref: /\b(referred|reference|told me about|recommended (you|your)|suggested you|friend (said|told))\b/i,
  wrong: /wrong number|who is this|who are you|kaun (hai|ho)|aap kaun/i,
  thanks: /^\s*(thanks?|thank you|thx|ty|thanku|shukriya|dhanyavad|dhanyawad)\b/i,
  bye: /^\s*(bye|good ?night|gn|see you|ok bye|tata|alvida)\b/i,
  yes: /^\s*(ok+|okay|k+|yes|yeah|yep|ya|yup|haan|ha|han|ji|ji haan|sure|done|fine|alright|cool|great|perfect|theek|thik|chalo|confirm(ed)?)\s*[.!]*\s*$/i,
  no: /^\s*(no|nope|nahi|nahin|na|not now|later|abhi nahi|no thanks)\s*[.!]*\s*$/i,
  abuse: /\b(idiot|stupid|fraud|scam|chor|bakwas|useless|cheat(er|ing)?|fuck|shit)\b/i,
  greet: /^\s*(hi+|hello+|hey+|hlo|helo|namaste|namaskar|good (morning|afternoon|evening)|hola|yo|sup|hii+)\b/i,
  job: /hiring|\bjobs?\b|internship|vacanc|career/i,
  vendor: /\b(supply|supplier|vendor|distributor)\b/i,
  disc: /discount|best price|kam kar|negotiat|less price|cheaper|final price/i,
  struct: /\b(wall|column|beam|structur\w*|seepage|leak\w*|crack\w*)\b/i,
  compl: /not started|delay|complain|refund|worst|pathetic|no one (is )?(coming|working)/i,
  update: /\bupdate\b|\bstatus\b|my site|progress/i,
  small: /only (need|want)|just (a|one)|\bsirf\b/i,
  item: /wardrobe|\bbed\b|\btable\b|tv unit|almirah/i,
  othercity: /jaipur|mumbai|bangalore|bengaluru|lucknow|chandigarh|pune|hyderabad|dehradun|kolkata|chennai/i,
  pooja: /pooja|puja|mandir|temple/i,
  vastu: /vastu/i,
  wall: /feature wall|accent wall|wall design|mosaic|relief|mirror wall|statement wall|wall art/i,
  reno: /renovat\w*|remodel\w*|makeover|redo my|purana ghar/i,
  developer: /\bdeveloper\b|show (flat|residence)|sample flat|facade|elevation for (my|our) project/i,
  offer: /\boffers?\b|\bdeal\b|scheme|promo|festive|diwali offer/i,
  services: /(your )?services|what (all )?do you do|kya kya karte|kya karte ho/i,
  process: /process|how (does it|do you) work|\bsteps\b|kaise kaam/i,
  office: /\b(office|clinic|shop|showroom|restaurant|commercial)\b/i,
  plot: /\bplot|\bgaj\b|\byards?\b|build a house|ghar banwana/i,
  notint: /not interested|nahi chahiye|don'?t want|no need/i,
  price: /price|cost|kitn|rate|budget|charges|lagega|quote|estimate/i,
  plan: /\b(plan|3d|design|visit|book|appointment|meet)\b/i,
  snag: /snag|inspection/i,
  guide: /\b(guide|cost guide|brochure|pdf|rate card|price list pdf)\b|send (it|the guide)|yes,? send it|guide bhej/i,
  refer: /^\s*refer\s*$|\b(referral (reward|bonus|program|scheme)|refer (a|my) (friend|relative|neighbou?r))\b/i,
};
export const EMO = /^[\s‍️\u{1F3FB}-\u{1F3FF}\p{Extended_Pictographic}]+$/u;
const ANGRY = /[😡😠🤬👎💩]/u;
const LOVE = /[❤️😍🔥👏💯🥰✨🙌]/u;
const THUMB = /[👍👌✅🙏]/u;
export const HINGLISH = /\b(kya|hai|kitna|kitne|kaise|kahan|kab|karna|chahiye|nahi|haan|aap|mujhe|hum|ghar|batao|bataiye|kar)\b/i;

/**
 * Classify one inbound message. ctx = { stage, waitingForHuman, lastText }
 * Returns { intent, handoff, priority } — priority order mirrors the flows doc section 03B.
 */
export function classify(raw, ctx = {}) {
  const t = String(raw || '').trim();
  const low = t.toLowerCase();
  const out = (intent, handoff = false) => ({ intent, handoff, lang: HINGLISH.test(t) ? 'hi' : 'en' });
  if (!t) return out('empty');
  if (R.stop.test(t)) return out('stop');
  if (ctx.stage === 'opted_out') return R.greet.test(t) || /👋/u.test(t) ? out('resubscribe') : out('silent_opted_out');
  if (/\d{10}/.test(t.replace(/\D/g, '')) && t.replace(/\D/g, '').length <= 13 && t.replace(/[\d\s+()-]/g, '').length === 0) return out('phone_shared');
  if (R.call.test(t) && !R.notcall.test(t)) return out('call_request', true);
  if (R.human.test(t)) return out('human', true);
  if (ctx.waitingForHuman) {
    if (R.chase.test(t) || (ctx.lastText && ctx.lastText.toLowerCase() === low)) return out('chase', true);
    return out('note_for_human');
  }
  if (R.avail.test(t)) return out('availability');
  if (R.abuse.test(t) || ANGRY.test(t)) return out('angry', true);
  if (R.compl.test(t)) return out('complaint', true);
  if (ctx.lastText && ctx.lastText.toLowerCase() === low && !R.yes.test(t) && !EMO.test(t) && !R.greet.test(t)) return out('repeat', true);
  if (t.split(/\s+/).length > 40) return out('long_brief', true);
  if (EMO.test(t)) {
    if (ANGRY.test(t)) return out('angry', true);
    if (THUMB.test(t)) return out('yes');
    if (LOVE.test(t)) return out('love');
    if (/👋/u.test(t)) return out('greeting');
    return out('emoji_unclear');
  }
  if (/^\s*[1-9]\s*$/.test(t)) return out('number_pick');
  if (R.yes.test(t)) return out('yes');
  if (R.no.test(t)) return out('no');
  if (R.thanks.test(t)) return out('thanks');
  if (R.bye.test(t)) return out('bye');
  if (R.bot.test(t)) return out('bot_question');
  if (R.contact.test(t)) return out('contact');
  if (R.loc.test(t)) return out('location');
  if (R.open.test(t)) return out('timings');
  if (R.timeline.test(t)) return out('timeline');
  if (R.emi.test(t)) return out('payment_terms');
  if (R.job.test(t)) return out('job');
  if (R.vendor.test(t)) return out('vendor', true);
  if (R.disc.test(t)) return out('discount', true);
  if (R.wall.test(t)) return out('feature_wall');
  if (R.struct.test(t)) return out('structural', true);
  if (R.update.test(t) && ['signed', 'client'].includes(ctx.stage)) return out('client_update', true);
  if (R.othercity.test(t)) return out('out_of_area');
  if (R.developer.test(t)) return out('developer', true);
  if (R.pooja.test(t)) return out('pooja_room');
  if (R.wall.test(t)) return out('feature_wall');
  if (R.vastu.test(t)) return out('vastu');
  if (R.reno.test(t)) return out('renovation');
  if (R.small.test(t) || R.item.test(t)) return out('small_scope');
  if (R.office.test(t)) return out('commercial', true);
  if (R.plot.test(t) || /\bconstruction\b|build (a|my) house/i.test(t)) return out('construction');
  if (R.warr.test(t)) return out('warranty');
  if (R.services.test(t)) return out('services');
  if (R.offer.test(t)) return out('offer');
  if (R.process.test(t)) return out('process');
  if (R.svc.test(t)) return out('service_question');
  if (R.port.test(t)) return out('portfolio');
  if (R.refer.test(t)) return out('refer_program');
  if (R.guide.test(t)) return out('guide');
  if (R.ref.test(t)) return out('referral');
  if (R.wrong.test(t)) return out('wrong_number');
  if (R.notint.test(t)) return out('not_interested');
  if (R.price.test(t)) return out('price');
  if (R.snag.test(t)) return out('snag_check');
  if (R.plan.test(t)) return out('visit_or_plan');
  if (R.greet.test(t)) return out('greeting');
  return out('unknown');
}
