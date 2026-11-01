// The design system's tokens.json from app/globals.css: every colour of `:root` (light) and `.dark`, exactly as the
// stylesheet has it. The type scale, spacing, shadows and layout entries, and every usage note, are kept from the
// system's current tokens.json; a colour the stylesheet no longer defines is listed, not dropped.
//
// node scripts/design-tokens.mjs <tokens.json read from the design system>  →  .design/system/project/tokens.json
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const live = process.argv[2];
if (!live || !existsSync(live)) {
  console.error('Pass the tokens.json read from the design system (Artifact read, path project/tokens.json).');
  process.exit(1);
}
const system = JSON.parse(readFileSync(live, 'utf8'));
const css = readFileSync(join(root, 'app/globals.css'), 'utf8');

/** `--name: value;` of one block, each with the comment above its group. */
function variablesOf(selector) {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('\n}', start));
  const variables = new Map();
  let comment = '';
  for (const match of body.matchAll(/\/\*([\s\S]*?)\*\/|--([\w-]+):\s*([^;]+);/g)) {
    if (match[1] !== undefined) comment = match[1].replace(/\s+/g, ' ').trim();
    else variables.set(match[2], { value: match[3].trim(), comment });
  }
  return variables;
}

const COLOUR = /^(#|oklch\(|rgb|hsl|var\(--)/;
const valueOf = (value) => value.replace(/^var\(--([\w-]+)\)$/, '{$1}');
const light = variablesOf(':root');
const dark = variablesOf('.dark');
const previous = new Map((system.color?.tokens ?? []).map((token) => [token.name, token]));

const tokens = [];
for (const [name, { value, comment }] of light) {
  if (!COLOUR.test(value)) continue;
  const darkValue = dark.get(name)?.value;
  tokens.push({
    name,
    value: darkValue && darkValue !== value ? { light: valueOf(value), dark: valueOf(darkValue) } : valueOf(value),
    usage: previous.get(name)?.usage ?? (comment || 'From app/globals.css.'),
  });
}
const gone = [...previous.keys()].filter((name) => !light.has(name));

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const next = {
  ...system,
  meta: {
    ...system.meta,
    source: 'github',
    repo: 'gitranks/gitranks-ui',
    ref: `main@${commit}`,
    status: 'live',
    synced: new Date().toISOString().slice(0, 10),
  },
  color: { ...system.color, tokens },
};
const out = join(root, '.design/system/project/tokens.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(next, null, 1)}\n`);
console.log(`${tokens.length} colours from app/globals.css @${commit}.`);
if (gone.length) console.log(`Not in the stylesheet any more (kept out): ${gone.join(', ')}`);
