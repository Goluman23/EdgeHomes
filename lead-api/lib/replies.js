// Approved replies for Edgehomes Architects, written from the website's own content
// (services, process, FAQ, studio hours). The concierge uses these first; Claude only fills gaps
// and is checked against the same facts. Every reply ends with a next step — never a dead end.
import { BRAND, STAFFED } from './config.js';
import { PRICE_BANDS, seasonAt, benefitActive, BENEFIT, upcomingMuhurats, specialHoursNotes } from './calendar.js';
import { ist } from './time.js';

export const BTN = {
  book: 'Book a consultation', plan: 'Send floor plan', designer: 'Talk to designer', prices: 'See prices',
  services: 'Our services', work: 'See our work', call: 'Call me',
};
const BOOK = [BTN.book, BTN.plan, BTN.designer];
const bandsText = () => PRICE_BANDS.map(b => `• ${b.label} — ${b.total} (${b.perSqft})`).join('\n');
export const isStaffed = now => { const h = ist(now).hh; return h >= STAFFED.startHour && h < STAFFED.endHour; };

function holidayLine(now) {
  const notes = specialHoursNotes(now);
  return notes.length ? `\n⚠️ ${notes.join(' · ')}` : '';
}
function locationText(lang, now) {
  const hi = lang === 'hi';
  const where = BRAND.studioAddress
    ? `📍 ${BRAND.name}, ${BRAND.studioAddress}`
    : `📍 ${BRAND.name} studio, ${BRAND.studioArea}`;
  const pin = BRAND.studioAddress ? '' : (hi ? '\nExact pin hamari team abhi bhej degi.' : '\nOur team will send you the exact pin.');
  return `${where}\n🗺 ${BRAND.mapLink}\n🕙 ${BRAND.hours}${holidayLine(now)}${pin}\n${hi ? 'Hum aapke ghar/plot par site consultation bhi karte hain.' : 'We also come to you — a site consultation at your home or plot.'}`;
}

const SERVICES_EN = `Four crafts, one studio — take one or all four:
1️⃣ Interiors — complete homes, consultancy to turnkey: living rooms, bedrooms, modular kitchens, lighting & false ceilings
2️⃣ Pooja rooms — temple-inspired mandirs, carved and lit
3️⃣ Feature walls — mirror mosaic, carved & backlit relief, mouldings
4️⃣ Build & architecture — plans, elevations and construction, plot to possession`;
const SERVICES_HI = `Ek studio, chaar kaam — ek lijiye ya chaaron:
1️⃣ Interiors — poora ghar, consultancy se turnkey tak: living, bedroom, modular kitchen, lighting, false ceiling
2️⃣ Pooja room — mandir design, carving aur lighting ke saath
3️⃣ Feature wall — mirror mosaic, carved aur backlit relief
4️⃣ Build & architecture — naksha, elevation aur construction, plot se possession tak`;

const PROCESS_EN = `Concept to keys, in five steps:
1. Consult — a site visit and a conversation about how you live and what you'd like to spend
2. Design & 3D — layouts, elevations and photoreal renders before work begins
3. Costing — an itemised estimate with every material named
4. Build — our own teams on site, with regular photo updates
5. Handover — a finished, styled home, ready the day you walk in`;
const PROCESS_HI = `Concept se chaabi tak, 5 steps:
1. Consult — site visit aur aapki zaroorat/budget par baat
2. Design & 3D — layout, elevation aur 3D, kaam shuru hone se pehle
3. Costing — itemised estimate, har material ka naam
4. Build — hamari apni team site par, regular photo updates
5. Handover — tayyar, styled ghar`;

/** reply(intent, ctx) -> { text, buttons, handoff, stage?, pauseHours?, tags? } */
export function reply(intent, ctx = {}) {
  const { name = '', lang = 'en', now = Date.now(), stage = 'new' } = ctx;
  const hi = lang === 'hi';
  const n = name ? ` ${name.split(' ')[0]}` : '';
  const staffed = isStaffed(now);
  const R = (text, buttons = BOOK, extra = {}) => ({ text, buttons, handoff: false, ...extra });
  const H = (text, buttons = [], extra = {}) => ({ text, buttons, handoff: true, pauseHours: 48, tags: ['NEEDS_HUMAN'], ...extra });

  switch (intent) {
    case 'stop':
      return { text: hi ? 'Theek hai — ab aapko koi message nahi aayega. Kabhi bhi "Hi" bhejkar wapas jud sakte hain.' : "Done — you won't get any more messages from us. Send \"Hi\" any time to restart.", buttons: [], handoff: false, stage: 'opted_out', tags: ['SUPPRESS_OPT_OUT', 'SUPPRESS_MARKETING'] };
    case 'silent_opted_out':
      return { text: '', buttons: [], handoff: false, silent: true };
    case 'resubscribe':
    case 'greeting':
      return greeting(stage, { n, hi, now });
    case 'offer': {
      const s = seasonAt(now);
      const lines = [];
      if (s.offerLine) lines.push(`✨ ${s.offerLine}`);
      if (benefitActive(now)) lines.push(`🎁 ${BENEFIT.line}`);
      if (!lines.length) return R(hi ? 'Abhi koi dated offer nahi chal raha. Par consultation aur 3D design dekhne ke liye studio aaiye — floor plan saath laaiye.' : "There's no dated offer running right now. Book a consultation and we'll show your home in 3D with an itemised estimate.");
      return R(`${hi ? 'Abhi yeh chal raha hai' : "Here's what's running right now"}:\n${lines.join('\n')}`);
    }
    case 'services':
      return R(hi ? SERVICES_HI : SERVICES_EN, ['Interiors', 'Pooja room', 'Feature wall', 'Construction']);
    case 'process':
      return R(hi ? PROCESS_HI : PROCESS_EN);
    case 'pooja_room':
      return R(hi ? 'Pooja room hamari signature craft hai — mandir design, carved panels, backlit relief aur brass detailing. Aapke ghar ki jagah aur vastu ke hisaab se design karte hain. Jagah ki photo ya floor plan bhejiye.' : "Pooja rooms are one of our signature crafts — temple-inspired mandirs with carved panels, backlit relief, storage and brass detailing, designed to your space and vastu. Send a photo of the space or your floor plan.", ['Send a photo', BTN.book, BTN.work], { tags: ['INTEREST_POOJA'] });
    case 'feature_wall':
      return R(hi ? 'Har Edgehomes ghar mein ek wall hoti hai jahan log ruk jaate hain — mirror mosaic, carved/backlit relief, temple carving. Wall ki photo bhejiye, hum idea dikhaenge.' : 'Every Edgehomes home has one wall people stop at — hand-set mirror mosaic, carved and backlit relief, temple carving. Send a photo of the wall and we will show you ideas.', ['Send a photo', BTN.book, BTN.work], { tags: ['INTEREST_WALL'] });
    case 'construction':
    case 'plot':
      return R(hi ? 'Plot hai? Naksha, elevation, construction aur interiors — ek hi team, plot se possession tak. Plot kahan hai aur kitna bada?' : 'Own a plot? Plans, elevations, construction and interiors — one team, plot to possession. Where is the plot and how big is it?', ['Faridabad', 'Palwal', 'Gurugram', 'Other'], { tags: ['PROPERTY_PLOT'] });
    case 'renovation':
      return R(hi ? 'Renovation bhi karte hain — poora ghar ya kuch kamre. Kaun se kamre aur ghar kitna purana hai?' : 'Yes, we renovate — a whole home or a few rooms. Which rooms, and how old is the home?', ['Full home', 'Kitchen + wardrobes', 'Living + bedrooms'], { tags: ['INTEREST_RENOVATION'] });
    case 'developer':
      return H(hi ? 'Developers ke liye facades, show residences aur commercial interiors turnkey karte hain. Hamari team aapse baat karegi.' : 'For developers we design facades, show residences and commercial interiors, delivered turnkey. Our team will take this up with you directly.', [BTN.call], { tags: ['INTEREST_DEVELOPER'] });
    case 'call_request':
      return staffed
        ? H(hi ? `Zaroor${n}! 📞 ${BRAND.designer} 10 minute mein call karenge. Ya seedha call karein: ${BRAND.phone}` : `Sure${n}! 📞 ${BRAND.designer} will call you within 10 minutes. Or call the studio on ${BRAND.phone}.`, ['Call me now', 'Pick a time', "I'll call you"])
        : H(hi ? 'Team abhi offline hai 🌙 Call-back ka time chuniye:' : 'Our team is offline right now 🌙 Pick a call-back time:', ['Tomorrow 10 AM', 'Tomorrow 12 PM', 'Tomorrow 6 PM']);
    case 'human':
      return H(staffed
        ? (hi ? `Bilkul — ${BRAND.designer} se jod rahe hain. Woh yahin 5 minute mein reply karenge.` : `Of course — connecting you to ${BRAND.designer}. They'll reply right here within 5 minutes.`)
        : (hi ? 'Team subah 9 baje se online hogi; sabse pehle aapko reply karenge. Call-back ka time chun lein?' : "Our team is back at 9 AM and you'll be first in line. Want to pick a call-back time?"), ['Call me instead']);
    case 'chase':
      return H(hi ? `Deri ke liye maafi${n} — ${BRAND.designer} ko abhi alert kar diya hai.` : `Sorry for the wait${n} — I've just alerted ${BRAND.designer} again.`, ['Call me instead']);
    case 'note_for_human':
      return { text: hi ? `Noted — ${BRAND.designer} yeh bhi dekhenge 📝` : `Noted — ${BRAND.designer} will see this too 📝`, buttons: [], handoff: true };
    case 'availability':
      return R(staffed ? (hi ? 'Haan, hum yahin hain 🙂 Chat karein ya quick call?' : "Yes, we're here 🙂 Chat here, or would you like a quick call?") : (hi ? 'Team abhi offline hai, par main madad kar sakta hoon. Subah call-back chahiye?' : 'The team is offline, but I can help now. Want a call-back in the morning?'), ['Quick call', 'Ask a question', BTN.book]);
    case 'angry':
    case 'complaint':
      return H(hi ? `Maafi chahte hain${n} — yeh experience hum nahi chahte. ${BRAND.designer} ko abhi bula rahe hain.` : `I'm really sorry${n} — that's not the experience we want for you. I'm getting ${BRAND.designer} on this now.`, []);
    case 'repeat':
    case 'long_brief':
      return H(hi ? `Detail ke liye shukriya — poora message ${BRAND.designer} ko bhej diya hai, woh yahin reply karenge.` : `Thank you for the detail — I've passed your full message to ${BRAND.designer}, who will reply right here.`, [BTN.book]);
    case 'yes':
      return R(hi ? 'Badhiya 👍 Aage badhte hain.' : "Great 👍 Let's keep going.");
    case 'no':
      return R(hi ? 'Koi baat nahi. Kab baat karein?' : 'No problem at all. When should we pick this up?', ['Next week', 'Next month', 'Just send the guide']);
    case 'love':
      return R(hi ? `Shukriya${n}! 💛 Apna ghar bhi aise 3D mein dekhna chahenge?` : `Thank you${n}! 💛 Want to see your own home like this — in 3D before we build?`, ['Yes, show me', BTN.prices]);
    case 'emoji_unclear':
    case 'unknown':
    case 'number_pick':
      return R(hi ? `Main madad karta hoon${n}! Inmein se chuniye 👇` : `Happy to help${n}! Pick one 👇`, [BTN.services, BTN.prices, BTN.book]);
    case 'thanks':
      return R(hi ? `Aapka swagat hai${n}! 😊` : `Anytime${n}! 😊`, stage === 'visit_booked' ? [] : [BTN.book]);
    case 'bye':
      return R(hi ? 'Take care! 👋 Kabhi bhi "Hi" bhejiye.' : "Take care! 👋 We're here whenever you need us — just say hi.", []);
    case 'bot_question':
      return R(hi ? `Main ${BRAND.short} ka assistant hoon 🤖 — chhote sawaal main sambhalta hoon, designer ek message door hain.` : `I'm the ${BRAND.short} assistant 🤖 — I handle the quick things; a designer is one message away.`, [BTN.designer, BTN.prices, BTN.book]);
    case 'contact':
      return R((hi ? `Zaroor! Humse yahan sampark kijiye 🙏` : `Of course! Here's how to reach us 🙏`) + `\n\n📞 ${BRAND.phone} (call or WhatsApp)\n💬 ${BRAND.whatsappLink}${BRAND.email ? `\n✉️ ${BRAND.email}` : ''}\n📍 ${BRAND.studioAddress || BRAND.studioArea}\n🗺 ${BRAND.mapLink}\n🕙 ${BRAND.hours}\n🌐 ${BRAND.site.replace('https://', '')}`, [BTN.call, BTN.book]);
    case 'location':
      return R(locationText(lang, now), [BTN.book, 'Site consultation'], BRAND.studioAddress ? {} : { tags: ['NEEDS_ADDRESS'] });
    case 'timings':
      return R(`🕙 ${hi ? 'Studio' : 'Studio hours'}: ${BRAND.hours}${holidayLine(now)}\n💬 ${hi ? 'Chat aur call: 9 AM – 9 PM' : 'Chat & calls: 9 AM – 9 PM'}`);
    case 'timeline': {
      const m = upcomingMuhurats(now);
      return R((hi ? '⏱ Design aur 3D pehle, phir costing, phir build. Ek 2 BHK turnkey: lagbhag 45–90 din; bade ghar aur construction zyada.' : '⏱ Design and 3D first, then costing, then build. A 2 BHK turnkey job takes about 45–90 days; larger homes and construction take longer.') + (m.length ? `\n🪔 ${hi ? 'Agle griha pravesh muhurat' : 'Next griha pravesh muhurats'}: ${m.join(', ')}` : ''));
    }
    case 'payment_terms':
      return R(hi ? '💳 Payment milestones mein: booking amount, phir kaam ke stages ke saath. Exact schedule itemised estimate ke saath milega.' : '💳 Payments are milestone-linked: a booking amount, then stages as work progresses. Your exact schedule comes with the itemised estimate.');
    case 'warranty':
      return R(hi ? '🛡 Hamare kaam par warranty aur hardware/appliances par brand warranty. Details estimate mein likhi hoti hain.' : '🛡 Our workmanship carries a warranty, and hardware and appliances carry brand warranties. The terms are written into your estimate.');
    case 'service_question':
      return R(hi ? SERVICES_HI : SERVICES_EN, ['Interiors', 'Pooja room', 'Feature wall', 'Construction']);
    case 'portfolio':
      return R(hi ? `Hamara kaam: ${BRAND.instagram} aur ${BRAND.site} 📸 Apne ghar ka 3D dekhna chahenge?` : `See our work: ${BRAND.instagram} and ${BRAND.site} 📸 Want to see your own home in 3D?`, ['Yes, show me', BTN.prices]);
    case 'referral':
      return R(hi ? 'Swagat hai! 🙏 Ghar kis shehar mein hai?' : 'Welcome! 🙏 Lovely that someone sent you our way. Which city is your home in?', BRAND.cities.slice(0, 4), { tags: ['SRC_REFERRAL'] });
    case 'wrong_number':
      return R(hi ? `Yeh ${BRAND.name} hai — architecture, interiors aur turnkey construction, Faridabad. Galti se aaya ho to "STOP" bhejiye.` : `This is ${BRAND.name} — architecture, interiors and turnkey construction, Faridabad. If this reached you by mistake, reply STOP.`, ['Tell me more']);
    case 'not_interested':
      return R(hi ? 'Koi baat nahi 🙏 Zaroorat ho to bas "Hi" bhejiye.' : 'No problem 🙏 If you ever need us, just send "Hi".', [], { stage: 'lost', lostReason: 'Other' });
    case 'price':
      return R(`${hi ? 'Turnkey interiors — price bands (Delhi NCR, 2026)' : 'Turnkey interior price bands (Delhi NCR, 2026)'}:\n${bandsText()}\n${hi ? 'Aapke ghar ka itemised estimate site visit aur design ke baad — har material ke naam ke saath.' : 'Your own itemised estimate follows the site visit and design stage, with every material named.'}${benefitActive(now) ? `\n🎁 ${BENEFIT.line}` : ''}`, [BTN.book, BTN.plan]);
    case 'discount':
      return H(hi ? `Pricing par ${BRAND.designer} khud baat karenge — yahin reply karenge.` : `${BRAND.designer} handles pricing personally and will reply right here.`, [BTN.book]);
    case 'structural':
      return H(hi ? 'Structural kaam ke liye hamara engineer pehle site dekhega. Designer aapse baat karenge.' : 'For structural work our engineer checks the site first. A designer will message you.', ['Book site visit']);
    case 'client_update':
      return H(hi ? `${BRAND.designer} aaj ki site update bhejenge.` : `${BRAND.designer} will send today's site update.`, []);
    case 'out_of_area':
      return R(hi ? 'Hum Faridabad se poore Delhi NCR mein kaam karte hain; door ke projects case-by-case dekhte hain. Project ke baare mein bataiye?' : "We're based in Faridabad and work across Delhi NCR; projects further away are discussed case by case. Tell us about the project?", [BTN.designer, 'No thanks'], { tags: ['CITY_OTHER'] });
    case 'small_scope':
      return R(hi ? 'Ek service bhi le sakte hain — jaise sirf pooja room, feature wall ya kitchen + wardrobes. Kya chahiye?' : 'You can hire us for a single service — just a pooja room, a feature wall, or kitchen + wardrobes. What do you need?', ['Pooja room', 'Feature wall', 'Kitchen + wardrobes', 'Just one item']);
    case 'vastu':
      return R(hi ? 'Haan — pooja room aur vastu ka dhyan design mein rakhte hain. Pooja room hamari signature craft hai.' : 'Yes — vastu preferences are built into the design, and pooja rooms are one of our signature crafts.', ['Pooja room', BTN.book]);
    case 'commercial':
      return H(hi ? 'Commercial project ke liye designer aapse detail lenge.' : 'For commercial projects a designer will take the brief from you.', ['Book a call']);
    case 'snag_check':
      return R(hi ? 'Free possession snag check: engineer plaster, seepage, levels aur electricals check karke 1-page report deta hai. Possession kab hai?' : 'Free possession snag check: an engineer checks plaster, seepage, levels and electricals and gives you a 1-page report. When is your possession?', ['Keys in hand', 'Within 3 months', '3–6 months', 'Later']);
    case 'visit_or_plan':
      return R(hi ? 'Consultation book karte hain — studio mein ya aapki site par. Floor plan yahan bhej dein to 3D tayyar rakhenge. Kaun sa din?' : "Let's book your consultation — at our studio or at your site. Send your floor plan here and we'll have your 3D ready. Which day suits you?", ['This weekend', 'Weekday', BTN.plan]);
    case 'phone_shared':
      return R(hi ? 'Number save ho gaya 👍 Designer isi par call karenge.' : 'Number saved 👍 The designer will call you on it.', ['Call me now', 'Pick a time']);
    case 'job':
      return R(hi ? 'Careers ke liye apna CV yahan bhejiye — team dekhegi.' : 'For careers, send your CV here and our team will review it.', [], { stage: 'not_lead', tags: ['NOT_LEAD_JOB'] });
    case 'vendor':
      return H(hi ? 'Vendor enquiries purchase team dekhti hai.' : 'Vendor enquiries go to our purchase team.', [], { stage: 'not_lead', tags: ['NOT_LEAD_VENDOR'] });
    default:
      return null;
  }
}

function greeting(stage, { n, hi, now }) {
  const B = (text, buttons) => ({ text, buttons, handoff: false });
  switch (stage) {
    case 'qualifying': return B(hi ? `Wapas swagat${n}! 👋 Bas 2 sawaal baaki hain. Aage badhein?` : `Welcome back${n}! 👋 You're two taps from your consultation. Shall we continue?`, ['Continue', BTN.designer]);
    case 'visit_booked': return B(hi ? `Hi${n}! 👋 Aapki consultation booked hai. Kya madad karun?` : `Hi${n}! 👋 Your consultation is booked. How can I help?`, ['Reschedule', 'Location', BTN.designer]);
    case 'walked_in': case 'proposal': return B(hi ? `Hi${n}! Estimate par koi sawaal?` : `Hi${n}! Any questions on your estimate?`, [BTN.designer, 'Payment schedule']);
    case 'signed': case 'client': return { text: hi ? `Hi${n}! ${BRAND.designer} ko bata diya hai — site update ya sawaal?` : `Hi${n}! I've let ${BRAND.designer} know — site update or a question?`, buttons: ['Site update', BTN.designer], handoff: true };
    case 'past_client': return B(hi ? `Aapse sunkar achha laga${n}! 💛 Ghar kaisa hai? Kya madad karein?` : `Lovely to hear from you${n}! 💛 How's the home? What can we help with?`, ['Service request', 'New project', 'Refer a friend']);
    case 'nurture': case 'lost': return B(hi ? `Wapas swagat${n}! 👋 Project abhi bhi plan mein hai?` : `Welcome back${n}! 👋 Is your home project still on?`, ['Yes, restart', 'Just browsing']);
    default: {
      const s = seasonAt(now);
      return B(`${hi ? 'Namaste' : 'Hi'}${n} 👋 ${hi ? `${BRAND.name} mein swagat — architecture, interiors aur turnkey construction, ek hi chhat ke neeche.` : `Welcome to ${BRAND.name} — homes, ${BRAND.promise}. Architecture, interiors and turnkey construction under one roof.`}${s.offerLine ? `\n✨ ${s.offerLine}` : ''}\n${hi ? 'Kaise madad karein?' : 'How can we help?'}`, ['Home interiors', 'Pooja room / feature wall', 'Build on my plot']);
    }
  }
}
