# Edge Homes — Lead System & Campaign Implementation Brief

**Client:** Edge Homes — Architects · Interiors · Constructions (since 2015) · +91 99114 46288 · edgehomesarchitects.in
**Prepared by:** 4SYSTMS · **Version:** 1.0 · 1 Nov 2026
**Sprint goal:** 10 walk-ins and 2 signed projects by 15 Nov 2026 (plan: 258 leads → 92 qualified → 26 booked → 15 walk-ins → 2–3 signed)

> **The most important rule.** One customer journey, one authoritative lifecycle stage and one coordinated messaging policy — even when several channels or campaigns touch the same person. Before sending anything, the system checks whether identities are linked, whether the person replied, what they were sent recently and what their stage allows.

This brief adapts the Infinity Gym system (implementation brief + campaign playbook + lead-api) to a turnkey interiors business. **Technical specification:** sections 2–9 and 12–14. **Campaign and content specification:** sections 10–11. The code in this repo implements sections 3–9; the workbook (`docs/EdgeHomes_Setup_Workbook.xlsx`) is the checklist form of the same content.

---

## 1. Reconciliation report — what changed from the Infinity system, and what conflicted in the Edge Homes documents

### 1.1 Infinity → Edge Homes mapping

| Infinity concept | Edge Homes equivalent | Why |
|---|---|---|
| Trial / gym visit | 60-minute **studio session** (or a live-site visit in the lead's city) | The walk-in is the conversion event that matters |
| Membership purchase | **Signed** = signed agreement + booking amount | Sprint definition of a conversion |
| Member / renewal | **Active client** → **Past client** (referrals) | No renewals; referrals replace them |
| Lead stages New → Booked → Visited → Joined | new → qualifying → qualified → visit_booked → walked_in → proposal → signed → client → past_client (+ nurture, no_show, lost, opted_out, not_lead) | Interiors need a proposal stage and a 2–6 week decision |
| SUPPRESS_ACTIVE_MEMBER | SUPPRESS_CLIENT + SUPPRESS_ACQUISITION | A booked or proposal-stage lead must not get "book a visit" offers |
| Price range ₹1,000–1,300/month, never exact | Price **bands** per BHK, never an exact figure for their home | Same rule, different numbers |
| 10,000-person society list | Past clients (200+), old enquiries, society QR sign-ups, partner contacts | Consent groups A–F (section 8) |
| Diwali offer "14 for 12" | Possession Pack (free snag check + 3D in 60 min) and the sign-by-15-Nov benefit (**not yet confirmed**) | Only confirmed offers go into messages |
| Cadence: 30 min, IG last-chance, d1, d3, d7 | 30 min, 2 h guide, IG last-chance (desk), d1, d3, d6, → nurture | Merges Infinity's engine with the sprint's +2 h / d3 / d6 plan |

### 1.2 Conflicts found and how they are resolved

| # | Conflict | Where | Resolution in this build |
|---|---|---|---|
| C1 | Follow-up timing: sprint says +2 h, d3, d6; flows doc and Infinity say +30 min, d1, d3, d7 | Sprint §7, flows WA-1, Infinity FOLLOWUPS | One cadence (section 6): 30 min, 2 h, d1, d3, d6, nurture d8 |
| C2 | "Qualified" vs lead score: sprint uses a rule (possession ≤ 6 months and ₹8 L+); flows use score ≥ 70 = HOT | Sprint §7, flows lead score | Both kept: **qualified** is the rule that moves the stage; **score/tier** only sets desk priority |
| C3 | Fields named `eh_*` in the flows doc vs SUPPRESS_* tags in the Infinity spec | Flows doc, Infinity spec | Fields stay `eh_*`; suppression is tags only, set by `followup-sync` and never by hand |
| C4 | Studio address and hours are not on the website, and the simulator says "to confirm" | Sprint §2, simulator | Bot never invents them: it hands off with `NEEDS_ADDRESS` until `EH_STUDIO_ADDRESS` / `EH_HOURS` are set |
| C5 | Sign-by-15-Nov benefit appears in creatives but terms are not approved | Sprint §5 | `BENEFIT.confirmed = false` in `lib/calendar.js`; no message or ad mentions it until flipped |
| C6 | Past-client referral reward: "₹25,000 off or a gift voucher" | Sprint §6.4 | Template variable `{{2}}` marked TO_CONFIRM |
| C7 | Instagram follow-ups: flows doc shows automated IG follow-ups; Infinity documents that the send API cannot reach Instagram | Flows IG-1, Infinity notes | IG follow-ups after 24 h are **desk tasks** using the human-agent tag (7 days); bot handles IG only inside 24 h |
| C8 | Two automations could nudge the same lead (inbox bot 30-min reminder + engine) | Infinity status notes | At go-live, turn **off** the inbox's built-in WhatsApp 30-min reminder; the engine owns WhatsApp follow-ups |
| C9 | Sprint gates were dated 25–27 Oct; today is 1 Nov | Sprint §9 | Rollout re-dated in section 13; Phase-1 "set-up" status must be confirmed |
| C10 | Website canonical points to edgehomes.in; trust counters render as 0 | Sprint §2 | Website fix list in `website/README.md`; website deploys from this repo |
| C11 | Muhurat dates for December not verified | Sprint §3 | Only November dates in the calendar; December TO_CONFIRM |
| C12 | Marketing consent: sprint's warm-database plan targets ≥ 500 numbers without stating consent source | Sprint §6.4 | Consent groups (section 8): only A–D may receive templates; F never |

### 1.3 Missing requirements now added

Universal listener (every message gets a reply), call-request and human-handoff rules, 48-hour human pause, opted-out silence with greeting re-subscribe, lost-reason capture, revenue credited to the converting message, failed-delivery logging, quiet days, and dry-run mode for every send.

---

## 2. System architecture (one repo, one record)

```
Meta ads (CTWA + forms) ─┐                    ┌─ EasySocial / ManyChat inbox (WhatsApp + Instagram bot)
Google Ads lead forms ───┤                    │      │ keyword flows → concierge fallback
Website form ────────────┼─► lead-api (Vercel) ◄──────┘ /api/es/concierge
Society QR / partners ───┘   /api/lead              ▲  /api/es/webhook (WhatsApp messages, ad referral)
                               │                    │  /api/es/followup-send · /api/es/followup-sync
                               ▼                    │
                      Google Sheet "Edge Homes Leads" (Apps Script)
                      Leads · Conversations · Follow-up log · Follow-up stats · Events
                      FollowupRunner every 10 min ──┘
                               ▲
                      n8n: Meta forms · Google forms · person-waiting alert · 9 PM scoreboard
```

- **Identity key:** normalised Indian mobile (`91XXXXXXXXXX`). Instagram-only contacts are keyed by handle until they share a number; two different numbers are never merged.
- **Source:** first source is never overwritten; last source always updates. Tags arrive via pre-filled wa.me text (`EH-META-FBD`, `EH-QR-BPTP77`, `EH-P-<partner>`) or the click-to-WhatsApp referral object.
- **Calendar:** `lead-api/lib/calendar.js` is the only place for seasons, offers, festivals, quiet days, muhurats and price bands.
- **Dry run:** `followup-send` and `followup-sync` send nothing until `FOLLOWUP_LIVE=1`.

## 3. Lifecycle stages

| Stage | Meaning | Automated sequence | Suppression |
|---|---|---|---|
| new | First message | 30 min, 2 h, d1, d3, d6 → nurture d8 | — |
| qualifying | Answering the 4 questions | same as new | — |
| qualified | Possession ≤ 6 months and budget ₹8 L+ (plots ₹25 L+) | designer call task, d1 slots, d3 proof, d6 muhurat → nurture d9 | — |
| nurture | Unqualified or "later" | monthly × 3 | — |
| visit_booked | Date + time in "Visit at" | confirm, 7 PM eve, 2 h before, outcome task | SUPPRESS_ACQUISITION |
| no_show | Missed visit | rebook call +30 min, template d1 → nurture d4 | — |
| walked_in | Met at studio / live site (**a walk-in**) | 3D same day, proposal ≤ 48 h, founder d3, "what matters most" d5 | SUPPRESS_ACQUISITION |
| proposal | Proposal delivered | check-in d2, founder d4, decision d7 | SUPPRESS_ACQUISITION |
| signed | Agreement + booking amount (**a conversion**) | welcome, kick-off task | SUPPRESS_CLIENT |
| client | Project running | none (site updates by hand) | SUPPRESS_CLIENT |
| past_client | Handed over | referral campaigns only | SUPPRESS_ACQUISITION |
| lost | Lost reason recorded | none | — |
| opted_out | Sent STOP | none; silent until they greet first | SUPPRESS_OPT_OUT, SUPPRESS_MARKETING |
| not_lead | Job seeker, vendor, wrong number | none | SUPPRESS_MARKETING |

**Rules:** the system only moves forward; customers (signed/client/past_client) never fall back into acquisition; opt-out always wins; the desk may set any stage, and a desk change clears the human pause and restarts the right sequence.

**Lost reasons:** Price / budget · Timing — not ready yet · Chose another designer · Location / distance · Scope too small · Possession delayed · Could not be contacted · Other.

## 4. Fields and tags

Fields: `eh_journey_stage`, `eh_city`, `eh_society`, `eh_property`, `eh_possession`, `eh_budget`, `eh_score`, `eh_tier`, `eh_first_source`, `eh_last_source`, `eh_visit_at`, `eh_designer`, `eh_callback`, `eh_lost_reason`, `eh_wa_consent`.

Tags: source `SRC_*` · city `CITY_FBD/GGN/NOI/PWL/DEL/OTHER` · intent `INTENT_HOT/WARM/COLD` · campaign `CMP_TOFU/MOFU/BOFU`, `CMP_SPRINT_NOV26`, `CMP_MUHURAT_DEC26` · property `PROPERTY_*` · handling `NEEDS_HUMAN`, `NEEDS_ADDRESS`, `CALLBACK_REQUESTED` · suppression `SUPPRESS_OPT_OUT`, `SUPPRESS_MARKETING`, `SUPPRESS_CLIENT`, `SUPPRESS_ACQUISITION`, `SUPPRESS_HUMAN_PAUSE` · `NOT_LEAD_*`. Full list with examples: workbook → Fields & Tags.

## 5. Conversation logic — every message heard

1. **Qualification (buttons, not typing):** city + society → possession (keys / ≤ 3 months / 3–6 / later) → home (2/3/4 BHK, builder floor, villa, plot) → budget (₹5–8 L / 8–15 / 15–25 / 25 L+) → floor plan → two studio slots.
2. **Priority stack** (implemented in `lib/intent.js`): STOP → opted-out silence → call request → human request → waiting-for-person (chase escalates, other text "noted") → "available?" → anger/abuse/complaint → repeat / 40+ words → emoji (👍 = yes, ❤️🔥 = thanks, 😡 = person) → number picks → yes/no → thanks/bye → bot question → contact, location, timings, timeline, payment terms → job/vendor/discount/structural/client update/out of area/small scope/vastu/commercial/plot → warranty, services, portfolio, referral, wrong number, not interested → price → snag check → visit/plan → greeting by stage → Claude fallback → "pick one" buttons.
3. **Greeting by stage:** new = welcome + season line; qualifying = "two taps from your 3D session"; booked = visit details; proposal = questions; client = hand to designer; past client = "how's the home?"; nurture/lost = "is the project still on?".
4. **Call requests:** 9 AM–9 PM → call within 10 min / pick a time / call 99114 46288; at night → call-back slots 10 AM / 12 PM / 6 PM; Instagram → ask for the number first.
5. **Hand to a person:** person/call/manager requests, complaints, anger, discount or "best price", structural work, commercial, voice notes, repeats, long briefs, 2 unclear replies. Automation pauses 48 h (visit reminders still go).
6. **Claude fallback** (`claude-haiku-5-5`, max 600 tokens, no temperature): approved facts only, price bands only, never confirms a booking; a guard rejects any rupee figure outside the bands.

## 6. Follow-up cadence (one engine, two runtimes)

`lead-api/lib/followups.js` is compiled into `apps-script/FollowupEngine.gs`; the sheet runs the identical code the tests cover. Sends only 9:30 AM–8:30 PM IST; nothing on 8 Nov, 25 Dec, 1 Jan. Session messages only inside the 24-hour window. Marketing templates need recorded consent; utility templates (visit confirmations and reminders) do not. Any reply restarts the new/qualified/nurture clock. Details: `lead-api/docs/FOLLOWUPS.md`.

## 7. WhatsApp template library

23 drafts in `lead-api/data/followup-templates.csv` (and workbook → Template Library): 3 session texts, 8 utility templates (visit confirm, eve and 2-hour reminders, rebook, callback confirm, proposal ready, welcome signed, site update) and 12 marketing templates (d1 guide, d3 proof, d6 muhurat, two slots, post-visit ask, proposal follow-up, nurture, warm-enquiry reopen, past-client referral, Possession Pack intro, festive greeting, benefit deadline). Names are suggestions; Meta decides category and approval. Never mix an offer into a utility template.

## 8. Contact consent groups and broadcast rules

| Group | Who | Allowed |
|---|---|---|
| A | Active clients | Service messages only |
| B | Past clients | Founder referral message once per campaign (confirm WhatsApp consent) |
| C | Old enquiries, last 18 months | `eh_warm_enquiry_reopen` once, second touch 5 days later, then stop — only with recorded consent |
| D | Society QR / stall sign-ups | `eh_possession_pack_intro` + flow |
| E | Partners | Personal founder messages, not broadcasts |
| F | Source unknown (directories, bought or society member lists) | **Never broadcast.** Reach through ads, RWA permission and QR opt-in |

Before every broadcast: dedupe by normalised phone; exclude opted_out, not_lead, active clients and human-paused leads; confirm template approval, variables, offer terms and consent source; send to a 10% test segment first; stop the campaign for anyone who replies positively and move them into the flow; track opt-outs, blocks and failures next to replies, visits and signatures.

## 9. Human desk

One owner on WhatsApp 9 AM–9 PM (reply target 5 minutes). n8n "person waiting" alert fires after 10 minutes. 9:30 AM: clear overnight leads. 1 PM: ad kill-rule check. 6 PM: confirm tomorrow's visits. 9 PM: scoreboard email (n8n) to Mr Deepak, Ms Priya and 4SYSTMS. The founder joins every decision meeting; no discount beyond the published benefit.

## 10. Meta, Google and Instagram campaigns

**Structure:** one prospecting campaign per city (C1), one retargeting campaign (C2), one BOFU visit campaign only if the audience is large enough (C3). Naming: `EH_<CITY>_<C#>_<FUNNEL>_<PURPOSE>_<MONTH>` — e.g. `EH_FBD_C1_TOFU_PROSPECT_NOV26`; ads `ANGLE_FORMAT_V#_DATE` (e.g. `MUHURAT_REEL_V1_NOV02`).

**Budget (sprint plan, ₹1.5 L):** Meta ₹60k (60% click-to-WhatsApp / 40% instant forms with consent checkbox; ₹3,600/day, halved 6–10 Nov), Google Search ₹35k, society activations ₹30k, creative ₹15k, warm list ₹3k, travel ₹7k. Kill rule: > ₹800 per lead after ₹5,000, or < 20% qualified after 15 leads. Media split hypothesis: 60% prospecting, 25% retargeting, 15% tests — don't force retargeting spend into a tiny audience.

**Angles (workbook → Ad Copy):** Muhurat · Layout proof ("your developer's layout, already designed") · Before/after · Price clarity (bands) · Plot owners (design + build). Real project footage only; city name on screen; no unconfirmed offer.

**Meta instant form:** 3 questions (possession month, society, BHK) + a WhatsApp consent checkbox: "I agree to receive messages about my home project from Edge Homes on WhatsApp. Reply STOP any time." n8n workflow 01 posts it to `/api/lead`.

**Instagram:** 3 reels a week (one per city), comment keywords `3D`, `PRICE`, `SNAG`, `VISIT` → DM → WhatsApp link with `EH-IG`. DM flow: 1) "What would you like help with? New home interiors / Build on my plot / See prices / Book studio visit" 2) "Which city and society?" 3) "Share your WhatsApp number and we'll send the cost guide and two studio slots."

**Google:** one campaign per city, exact + phrase match, negatives (course, job, free, cheap, DIY, software, internship); lead forms → n8n workflow 02.

## 11. Society and partner acquisition (no cold blasting)

**RWA message:** "Namaste, we're Edge Homes — architects, interiors and turnkey construction since 2015. Many residents of {society} are taking possession this season. We'd like to offer residents a free possession snag check and a short 'Possession to Griha Pravesh' session at the clubhouse. Could we discuss a small pilot with the RWA or facility-management team?"

**On the day:** standee + QR (`EH-QR-<SOCIETY>`), tablet with that developer's 3D layouts, sign-up sheet that states what messages people agree to receive. Only sign-ups (group D) get follow-ups. Weekends: 31 Oct–1 Nov (confirm if it ran) and 14–15 Nov.

**Partners:** 10 brokers, home-loan agents, CAs, structural engineers and Palwal plot dealers; 2% of contract on first payment; personal wa.me link `EH-P-<name>`.

## 12. Metrics

Cost per lead · qualified rate · cost per qualified lead (≤ ₹1,400) · cost per booked visit · show rate (target 60–70%) · walk-in → proposal (80%) · walk-in → signed · cost per signed client (plan ≈ ₹75,000 on ₹15 L average) · median first-reply time (≤ 5 min) · opt-out rate · revenue credited per template (Follow-up stats tab). For every lead keep: first and last source, campaign, first enquiry, first human response, visit, walk-in, proposal value, signed value, paid on, lost reason. Revenue is not profit: track the benefit cost and partner fees against signed value.

## 13. Rollout (re-dated from 1 Nov)

| When | Work | Gate |
|---|---|---|
| Sun 1 – Mon 2 Nov | Repo deployed to Vercel (`api.edgehomesarchitects.in`), sheet set up, n8n imported, all tests green, studio facts confirmed | `/api/health` all green; dry-run QA passes |
| Mon 2 – Tue 3 Nov | Inbox audit; create fields/tags; submit templates; consent groups tagged; turn off inbox WhatsApp 30-min reminder | Templates submitted; zero duplicate rows in QA |
| Tue 3 Nov | Go live: `FOLLOWUP_LIVE=1`, `resetDryRunMarks()`, small warm test (10% of group C) | First real sends logged; no opt-out spike |
| 3 – 5 Nov | Full spend; designer calls on every qualified lead | 9 walk-ins by 5 Nov (stretch, given the late start) |
| 6 – 10 Nov | Diwali: cold spend halved, greetings without offers, proposals and decision meetings | First signature |
| 11 – 15 Nov | Close: society weekend 14–15 Nov, founder decision meetings, benefit message only if confirmed | 15 walk-ins, 2 signed |

## 14. Launch checklist

- [ ] Studio address, map pin, hours, email set in Vercel env (`EH_*`) — bot hands off until then
- [ ] Booking amount, design-fee terms, benefit wording approved → `BENEFIT.confirmed = true`
- [ ] Consent source recorded for every imported list; group F excluded
- [ ] Inbox fields, tags and SUPPRESS_* tags created; IDs in `ES_TAG_IDS` (or ManyChat tag names)
- [ ] Templates approved; `ES_CAMPAIGNS` / `MC_FLOWS` mapped
- [ ] Concierge connected as the inbox's fallback; webhook verified with `ES_WEBHOOK_VERIFY_TOKEN`
- [ ] Inbox's own WhatsApp 30-min reminder turned off
- [ ] Desk owner named for 9 AM–9 PM; DESK_EMAIL set; n8n alerts active
- [ ] All QA tests pass in dry run (`npm test` + manual QA-17 to QA-22)
- [ ] `FOLLOWUP_LIVE=1` via a fresh git deploy, then `resetDryRunMarks()` in the sheet

## 15. Open questions for Edge Homes

1. Studio address, parking, hours; live sites that can host visits in each city.
2. Booking amount and design-fee terms; benefit wording and whether it applies.
3. Past-client referral thank-you (₹25,000 off or a voucher?).
4. Size and consent source of the past-client and old-enquiry lists.
5. EasySocial or ManyChat as the main inbox (or both: which owns WhatsApp?).
6. Desk owner and designer names; who joins decision meetings.
7. Did the 31 Oct–1 Nov society weekend run? How many sign-ups?
8. Meta and Google spend so far, and budget for 2–15 Nov.

## 16. Implementation prompt (paste into the Claude project that has this repo)

```
You are implementing the Edge Homes lead system. This repo (edge-homes) is the source of truth:
docs/EDGE-HOMES-IMPLEMENTATION-BRIEF.md is the technical and campaign specification, and
docs/EdgeHomes_Setup_Workbook.xlsx is its checklist. lead-api/ is the Vercel back end,
apps-script/ the Google Sheet engine, n8n/ the workflows.

Before changing anything:
1. Audit the live inbox (EasySocial or ManyChat): list existing flows, keywords, fields, tags,
   templates, campaigns, webhooks and the built-in reminders. Compare with workbook sheets
   "Fields & Tags", "Automation Rules" and "Template Library". Report matches, gaps and conflicts.
2. Verify which triggers, fields, tag APIs and send APIs the account actually supports. Do not
   pretend unsupported functionality exists. Instagram follow-ups after 24 h stay desk tasks unless
   a supported send capability is confirmed.
3. Return a capability audit and a consolidated plan. Reuse existing components; never build a
   parallel flow. Wait for approval.

After approval:
4. Create missing fields, tags and SUPPRESS_* tags; record their IDs for ES_TAG_IDS.
5. Submit the templates marked "template" (realistic sample values, correct language, no offer in
   utility templates). Leave every campaign in draft.
6. Connect the concierge (/api/es/concierge with x-concierge-key) as the fallback for unmatched
   messages, and the WhatsApp webhook (/api/es/webhook).
7. Fill the EasySocial request shapes in lead-api/lib/providers/easysocial.js from the working
   Infinity lead-api (same product), or use PROVIDER=manychat.
8. Run npm test and the manual QA rows (QA-17 to QA-22) in dry run. Fix failures.
9. Keep FOLLOWUP_LIVE unset until templates are approved, offers confirmed, consent established
   and QA passes. Document anything that cannot be completed and why.

Never: quote exact prices, invent the studio address, message opted-out or group-F contacts,
send acquisition offers to booked/proposal/signed/client leads, or merge two different phone numbers.
```

---
*Sources for market and benchmark figures: see `docs/strategy/edgehomes-21-day-walkin-sprint.html` (Magicbricks/NBM, Interior Company, Anarock, Sell.Do, OwlClaw, Astroyogi). WhatsApp Business Messaging Policy: https://whatsappbusiness.com/policy/ — confirm current rules before launch. Conversion rates are planning assumptions; replace them with the sprint's own rates.*
