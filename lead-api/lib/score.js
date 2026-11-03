// Lead score 0–100 and the sprint's "qualified" rule.
// Qualified = keys in hand / possession within 6 months AND budget ₹8 L+ (₹25 L+ for plot construction).
const POSS = { keys: 30, '0-3': 30, '3-6': 20, '6-12': 5, later: 0 };
const BUDGET = { '5-8': 5, '8-15': 20, '15-25': 30, '25+': 35 };
const TARGET = ['Faridabad', 'Gurugram', 'Noida', 'Palwal'];

export function normPossession(v) {
  const s = String(v || '').toLowerCase();
  if (!s) return '';
  if (/key|hand|already|got possession|ready/.test(s)) return 'keys';
  if (/within 3|0-3|1-3|next month|this month|3 months/.test(s)) return '0-3';
  if (/3-6|3 to 6|6 months/.test(s)) return '3-6';
  if (/6-12|year|12/.test(s)) return '6-12';
  if (/later|not sure|don/.test(s)) return 'later';
  return '';
}
export function normBudget(v) {
  const s = String(v || '').toLowerCase().replace(/[₹,\s]/g, '');
  if (!s) return '';
  if (/25\+|25l\+|above25|25lakh\+|cr/.test(s)) return '25+';
  if (/15-25|15to25/.test(s)) return '15-25';
  if (/8-15|8to15/.test(s)) return '8-15';
  if (/5-8|5to8|under8|below8/.test(s)) return '5-8';
  const n = parseFloat(s);
  if (!isNaN(n)) return n >= 25 ? '25+' : n >= 15 ? '15-25' : n >= 8 ? '8-15' : '5-8';
  return '';
}

export function scoreLead(l) {
  const poss = normPossession(l.possession), bud = normBudget(l.budget);
  let s = (POSS[poss] || 0) + (BUDGET[bud] || 0);
  if (TARGET.includes(l.city)) s += 10;
  if (l.floorPlan) s += 15;
  if (l.fastAnswers) s += 5;
  s = Math.min(100, s);
  const plot = /plot/i.test(l.property || '');
  const possOk = ['keys', '0-3', '3-6'].includes(poss);
  const budOk = plot ? bud === '25+' : ['8-15', '15-25', '25+'].includes(bud);
  const tier = s >= 70 ? 'HOT' : s >= 40 ? 'WARM' : 'COLD';
  return { score: s, tier, qualified: possOk && budOk, possession: poss, budget: bud };
}
