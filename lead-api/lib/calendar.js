// THE ONE CALENDAR. Concierge, follow-ups, the sheet engine and the n8n scoreboard all
// read this file. Change offers and dates here only. An offerLine of null means
// "no offer is confirmed" and no message may mention one.
import { ist } from './time.js';

export const CALENDAR_VERSION = '2026-11-01';

// Sign-by-deadline benefit (sprint offer). Confirm terms with Edgehomes before use.
export const BENEFIT = {
  deadline: '2026-11-15',
  confirmed: false, // TO_CONFIRM: flip to true once Mr Deepak / Ms Priya approve the wording
  line: 'Sign by 15 Nov: design fee adjusted against execution, price locked till 31 Jan, plus one upgrade.',
};

export const SEASONS = [
  { id: 'sprint', start: '2026-10-25', end: '2026-11-15', label: 'Possession Pack sprint',
    offerLine: 'Bring your floor plan, leave with your living room and kitchen in 3D and a price band in 60 minutes.' },
  { id: 'muhurat', start: '2026-11-16', end: '2026-12-20', label: 'Griha pravesh season', offerLine: null },
  { id: 'xmas', start: '2026-12-21', end: '2026-12-25', label: 'Christmas', offerLine: null },
  { id: 'newyear', start: '2026-12-26', end: '2027-01-15', label: 'New Year', offerLine: null },
];

// Festivals: greetings only, never an offer in the same message.
export const FESTIVALS = {
  '2026-11-06': 'Dhanteras', '2026-11-08': 'Diwali', '2026-11-10': 'Govardhan Puja',
  '2026-11-11': 'Bhai Dooj', '2026-11-15': 'Chhath', '2026-12-25': 'Christmas', '2027-01-01': 'New Year',
};

// Studio holiday hours. Shown in timings / location / visit replies only within 7 days of the date,
// never inside offer templates. TO_CONFIRM with the studio before each festival.
// { date: 'YYYY-MM-DD', label: 'Diwali', hours: null (closed) | '10 AM – 2 PM' }
export const SPECIAL_HOURS = [];

// No automated follow-ups on these days; due steps move to the next day.
export const QUIET_DAYS = ['2026-11-08', '2026-12-25', '2027-01-01'];

// Ads: cold spend halved 6–10 Nov (Diwali); retargeting and follow-ups stay on.
export const REDUCED_SPEND = { start: '2026-11-06', end: '2026-11-10' };

// Griha pravesh dates as published by Astroyogi (checked 25 Oct 2026). December: TO_CONFIRM.
export const MUHURATS = ['2026-11-11', '2026-11-14', '2026-11-20', '2026-11-21', '2026-11-25', '2026-11-26'];

// Price bands to quote (Delhi NCR 2026, Interior Company). Bands only — never an exact quote.
export const PRICE_BANDS = [
  { key: '2bhk', label: '2 BHK', perSqft: '₹1,000–1,200/sq ft', total: '₹8–11 lakh' },
  { key: '3bhk', label: '3 BHK', perSqft: '₹1,200–1,700/sq ft', total: '₹10–15 lakh' },
  { key: '4bhk', label: '4 BHK', perSqft: '₹2,000–2,200/sq ft', total: '₹14–20 lakh' },
  { key: 'villa', label: 'Villa / builder floor', perSqft: '₹3,000–3,500/sq ft', total: '₹18–25 lakh+' },
];

export function seasonAt(ts) {
  const { ymd } = ist(ts);
  return SEASONS.find(s => ymd >= s.start && ymd <= s.end) || { id: 'evergreen', label: 'Evergreen', offerLine: null };
}
export const isQuietDay = ts => QUIET_DAYS.includes(ist(ts).ymd);
export const festivalOn = ts => FESTIVALS[ist(ts).ymd] || null;
export function benefitActive(ts) {
  return BENEFIT.confirmed && ist(ts).ymd <= BENEFIT.deadline;
}
export function upcomingMuhurats(ts, n = 3) {
  const { ymd } = ist(ts);
  return MUHURATS.filter(d => d >= ymd).slice(0, n);
}

/** Holiday-hours lines for the next 7 days (empty when none). */
export function specialHoursNotes(ts) {
  const { ymd } = ist(ts);
  const until = ist(ts + 7 * 86400000).ymd;
  return SPECIAL_HOURS.filter(h => h.date >= ymd && h.date <= until)
    .map(h => `${h.label} (${h.date.slice(8)}/${h.date.slice(5, 7)}): ${h.hours ? h.hours : 'studio closed'}`);
}
