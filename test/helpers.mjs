// Self-check for the helpers embedded in index.html + every URL in grades/*.csv.
// Run: node test/helpers.mjs   (from the repo root)
import { readFileSync, readdirSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const block = html.match(/\/\* --- helpers[\s\S]*?--- end helpers --- \*\//);
if (!block) throw new Error('helper block markers missing from index.html');
const { toEmbed, parseCSVLine } = new Function(`${block[0]}; return { toEmbed, parseCSVLine };`)();

let failed = 0;
const check = (name, actual, expected) => {
  const ok = actual === expected;
  if (!ok) { failed++; console.error(`FAIL ${name}: got ${actual}, want ${expected}`); }
  else console.log(`ok   ${name}`);
};

// --- toEmbed ---
check('watch?v=',
  toEmbed('https://www.youtube.com/watch?v=rFDlcY28UEM'),
  'https://www.youtube-nocookie.com/embed/rFDlcY28UEM?rel=0');
check('app=desktop&v= (param order)',
  toEmbed('https://www.youtube.com/watch?app=desktop&v=C0EcCzLQxik'),
  'https://www.youtube-nocookie.com/embed/C0EcCzLQxik?rel=0');
check('live/ + start time',
  toEmbed('https://www.youtube.com/live/TBCLKVCA3n8?si=abc&t=214'),
  'https://www.youtube-nocookie.com/embed/TBCLKVCA3n8?rel=0&start=214');
check('youtu.be short link',
  toEmbed('https://youtu.be/I4PGv09T4qc'),
  'https://www.youtube-nocookie.com/embed/I4PGv09T4qc?rel=0');
check('shorts',
  toEmbed('https://www.youtube.com/shorts/kzq3YGXpi-4'),
  'https://www.youtube-nocookie.com/embed/kzq3YGXpi-4?rel=0');
check('non-video url rejected', toEmbed('https://example.com/nope'), null);
check('garbage rejected', toEmbed('not a url'), null);
check('empty rejected', toEmbed(''), null);

// --- parseCSVLine ---
check('quoted title', JSON.stringify(parseCSVLine('3,"Ten Black Dots",https://x/y')), JSON.stringify(['3', 'Ten Black Dots', 'https://x/y']));
check('comma inside quotes', JSON.stringify(parseCSVLine('4,"Hello, World",https://x/y')), JSON.stringify(['4', 'Hello, World', 'https://x/y']));
check('escaped quote', JSON.stringify(parseCSVLine('5,"Say ""hi""",https://x/y')), JSON.stringify(['5', 'Say "hi"', 'https://x/y']));

// --- every real row ---
const dir = new URL('../grades/', import.meta.url);
let rows = 0;
for (const file of readdirSync(dir).filter(f => f.endsWith('.csv'))) {
  const lines = readFileSync(new URL(file, dir), 'utf8').trim().split(/[\r\n]+/).slice(1);
  for (const line of lines) {
    const [week, title, url] = parseCSVLine(line);
    if (!week || !title || !url || !/^\d+$/.test(week.trim())) {
      failed++; console.error(`FAIL ${file}: malformed row -> ${line}`);
      continue;
    }
    if (!toEmbed(url)) { failed++; console.error(`FAIL ${file}: unembeddable url -> ${url}`); continue; }
    rows++;
  }
}
console.log(`ok   ${rows} rows across all grade CSVs parse and embed`);

console.log(failed ? `\n${failed} FAILURE(S)` : '\nall checks passed');
process.exit(failed ? 1 : 0);
