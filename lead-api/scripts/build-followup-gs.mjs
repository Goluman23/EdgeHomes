// Compiles lib/time.js + lib/calendar.js + lib/stages.js + lib/followups.js into
// ../apps-script/FollowupEngine.gs so the Google Sheet runs the same engine the tests cover.
// Usage: npm run build:gs        (writes the file)
//        node scripts/build-followup-gs.mjs --check   (fails if the committed file is stale)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const lib = join(here, '..', 'lib');
const out = join(here, '..', 'apps-script', 'FollowupEngine.gs');
const parts = ['time.js', 'calendar.js', 'stages.js', 'followups.js'];

function strip(src, name) {
  const body = src
    .split('\n')
    .filter(l => !/^\s*import\s.+from\s.+;\s*$/.test(l))
    .map(l => l.replace(/^export\s+(?=(const|function|let|class)\b)/, ''))
    .join('\n');
  if (/\?\.|\bexport\b|\bprocess\.env\b/.test(body)) throw new Error(`${name}: not Apps Script safe (optional chaining / export / process.env)`);
  return `// ---- ${name} ----\n${body.trim()}\n`;
}

const banner = '// GENERATED FILE — do not edit. Source: lead-api/lib/{' + parts.join(',') + '}\n// Rebuild with: cd lead-api && npm run build:gs\n\n';
const code = banner + parts.map(p => strip(readFileSync(join(lib, p), 'utf8'), p)).join('\n');

if (process.argv.includes('--check')) {
  const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (cur !== code) { console.error('FollowupEngine.gs is stale — run npm run build:gs'); process.exit(1); }
  console.log('FollowupEngine.gs is up to date');
} else {
  writeFileSync(out, code);
  console.log('wrote', out, code.length, 'bytes');
}
