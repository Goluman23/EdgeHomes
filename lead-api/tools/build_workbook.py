# Builds lead-api/data/followup-templates.csv and docs/EdgeHomes_Setup_Workbook.xlsx
import csv, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from content import *
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.comments import Comment

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, 'data/followup-templates.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['key', 'kind', 'meta_category', 'used_in', 'language', 'body', 'sample_values', 'buttons', 'status'])
    for t in TEMPLATES:
        w.writerow([t[0], t[1], t[2], t[3], 'en', t[4], t[5], t[6], ('hold — submit only after BENEFIT.confirmed' if t[0] == 'eh_benefit_deadline' else 'draft — submit to Meta') if t[1] == 'template' else 'session text (no approval)'])

NAVY = PatternFill('solid', start_color='0F1E36'); GOLD = 'C6A15B'
HF = Font(name='Arial', bold=True, color='F1EADB', size=10); BF = Font(name='Arial', size=10)
INPUT = Font(name='Arial', size=10, color='0000FF'); YEL = PatternFill('solid', start_color='FFF2B3')
thin = Side(style='thin', color='E6DFD2'); BORDER = Border(top=thin, bottom=thin, left=thin, right=thin)
wb = Workbook()

def sheet(title, headers, rows, widths):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for c in ws[1]: c.font = HF; c.fill = NAVY; c.alignment = Alignment(vertical='center', wrap_text=True)
    for r in rows: ws.append(list(r))
    for row in ws.iter_rows(min_row=2):
        for c in row: c.font = BF; c.alignment = Alignment(wrap_text=True, vertical='top'); c.border = BORDER
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'; ws.auto_filter.ref = ws.dimensions
    return ws

ws = wb.active; ws.title = 'Start Here'
lines = [
 ('EDGE HOMES · Lead system setup workbook', True),
 ('One customer journey · one lifecycle stage · one coordinated messaging policy — across WhatsApp, Instagram, Meta forms, Google, website and society QR.', False),
 ('', False),
 ('How to use', True),
 ('1. Read docs/EDGE-HOMES-IMPLEMENTATION-BRIEF.md first. This workbook is its checklist form.', False),
 ('2. Audit the live inbox (EasySocial or ManyChat) against "Fields & Tags" and "Automation Rules" before changing anything.', False),
 ('3. Create missing fields/tags; reuse anything that already exists. Never build a second, parallel flow.', False),
 ('4. Submit "Template Library" rows with kind = template to Meta. Session rows need no approval.', False),
 ('5. Run every "QA Tests" row in dry run. Keep campaigns in draft until templates, offers, consent and QA are confirmed.', False),
 ('', False),
 ('Hard rules', True),
 ('• Customer status overrides campaign status: a booked, signed or opted-out lead never gets an acquisition message.', False),
 ('• Opt-out applies on every channel immediately. Silence is not permission.', False),
 ('• Never quote an exact price in chat — bands only. Never confirm a booking from the bot.', False),
 ('• Instagram follow-ups after 24 h are desk tasks (human agent tag, 7 days). The send API covers WhatsApp only.', False),
 ('• Contacts whose consent source cannot be shown (group F) are never broadcast to.', False),
 ('', False),
 ('Legend', True),
 ('Blue text = values you type (Scoreboard inputs). Yellow fill = TO_CONFIRM with Edge Homes.', False),
 ('', False),
 ('Open items (TO_CONFIRM)', True),
 ('Studio address, map pin and hours · booking amount and design-fee terms · sign-by-15-Nov benefit wording · past-client referral thank-you · consent source of past-client and old-enquiry lists · inbox: EasySocial or ManyChat · desk owner 9 AM–9 PM · designer names', False),
]
for i, (t, b) in enumerate(lines, 1):
    c = ws.cell(row=i, column=1, value=t); c.font = Font(name='Arial', size=14 if i == 1 else 10, bold=b, color='0F1E36' if b else '1A1F29')
    c.alignment = Alignment(wrap_text=True, vertical='top')
ws['A22'].fill = YEL
ws.column_dimensions['A'].width = 120

sheet('Stages', ['Stage key', 'Label', 'Meaning', 'Automated sequence', 'Suppression tags'], STAGES, [14, 16, 48, 48, 34])
f = sheet('Fields & Tags', ['Field / tag group', 'Type or values', 'Purpose', 'Example'], FIELDS + [('', '', '', '')] + [(g, v, p, '') for g, v, p in TAGS], [22, 44, 56, 26])
sheet('Automation Rules', ['ID', 'Trigger', 'Condition', 'Action', 'Exit / exception'], RULES, [7, 38, 22, 70, 30])
t = sheet('Template Library', ['Key', 'Kind', 'Meta category', 'Used in', 'Body (English)', 'Sample values', 'Buttons', 'Status'],
          [(x[0], x[1], x[2], x[3], x[4], x[5], x[6], 'Draft — submit' if x[1] == 'template' else 'Session text') for x in TEMPLATES], [24, 10, 12, 26, 70, 34, 30, 14])
for row in t.iter_rows(min_row=2):
    if row[0].value in ('eh_past_client_referral', 'eh_benefit_deadline'): row[7].fill = YEL; row[7].value = 'TO_CONFIRM offer'
sheet('Consent Groups', ['Group', 'Who', 'Relationship', 'Allowed', 'Check before sending'], CONSENT, [7, 34, 30, 50, 46])
sheet('Meta Campaigns', ['Campaign name', 'City', 'Destination', 'Audience', 'Angles', 'wa.me tag'], ADS, [36, 11, 26, 50, 44, 14])
sheet('Ad Copy', ['Angle', 'Primary text', 'Headline', 'CTA'], AD_COPY, [22, 90, 30, 14])
sheet('QA Tests', ['ID', 'Scenario', 'Expected', 'Automated test / how'], QA, [8, 46, 56, 26])

# Scoreboard with live formulas
s = wb.create_sheet('Scoreboard')
s.append(['Metric', 'Target by 5 Nov', 'Target by 15 Nov', 'Actual (type)', '% of 15 Nov target', 'Red flag'])
for c in s[1]: c.font = HF; c.fill = NAVY
data = [('Leads', 140, 258, '< 10 a day for 2 days'), ('Qualified', 50, 92, '< 25% of leads'), ('Visits booked', 15, 26, '< 1 a day'),
        ('Walk-ins', 9, 15, '< 4 on 3 Nov'), ('Proposals sent', 7, 12, 'Any later than 48 h'), ('Signed', 0, 2, '0 by 12 Nov')]
for i, (m, a, b, flag) in enumerate(data, 2):
    s.cell(row=i, column=1, value=m); s.cell(row=i, column=2, value=a); s.cell(row=i, column=3, value=b)
    s.cell(row=i, column=4).font = INPUT
    s.cell(row=i, column=5, value=f'=IF(D{i}="","",D{i}/C{i})'); s.cell(row=i, column=5).number_format = '0%'
    s.cell(row=i, column=6, value=flag)
s['A10'] = 'Ad spend to date (₹)'; s['D10'].font = INPUT; s['D10'].number_format = '#,##0'
s['A11'] = 'Cost per lead (₹)'; s['D11'] = '=IF(OR(D2="",D2=0,D10=""),"",D10/D2)'
s['A12'] = 'Cost per qualified lead (₹) · target ≤ 1,400'; s['D12'] = '=IF(OR(D3="",D3=0,D10=""),"",D10/D3)'
s['A13'] = 'Cost per walk-in (₹) · plan ≈ 10,000'; s['D13'] = '=IF(OR(D5="",D5=0,D10=""),"",D10/D5)'
s['A14'] = 'Qualified rate'; s['D14'] = '=IF(OR(D2="",D2=0,D3=""),"",D3/D2)'
s['A15'] = 'Show rate (walk-ins ÷ booked)'; s['D15'] = '=IF(OR(D4="",D4=0,D5=""),"",D5/D4)'
s['A16'] = 'Walk-in → signed'; s['D16'] = '=IF(OR(D5="",D5=0,D7=""),"",D7/D5)'
for r in (11, 12, 13): s[f'D{r}'].number_format = '#,##0'
for r in (14, 15, 16): s[f'D{r}'].number_format = '0%'
s['A18'] = 'Targets: Edge Homes 21-Day Walk-in Sprint (4SYSTMS, 25 Oct 2026). Type actuals in blue cells; the 9 PM n8n email gives the same counts from the Leads sheet.'
for row in s.iter_rows():
    for c in row:
        if c.font != HF and c.font != INPUT: c.font = BF
for col, w in zip('ABCDEF', [44, 16, 16, 16, 18, 24]): s.column_dimensions[col].width = w
s['D10'].comment = Comment('Total Meta + Google spend since 25 Oct, from Ads Manager.', '4SYSTMS')

out = os.path.join(ROOT, 'docs/EdgeHomes_Setup_Workbook.xlsx')
wb.save(out); print('saved', out)
