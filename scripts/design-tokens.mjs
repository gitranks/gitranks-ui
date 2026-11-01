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

/** `--name: value;` of one block (`:root`, `.dark`), each with the last comment above it. */
function variablesOf(selector) {
  const head = new RegExp(`^${selector.replace('.', '\\.')} \\{$`, 'm').exec(css);
  if (!head) return new Map();
  // A comment after a declaration on its own line describes that line, not the ones below.
  const body = css.slice(head.index, css.indexOf('\n}', head.index)).replace(/;[ \t]*\/\*[\s\S]*?\*\//g, ';');
  const variables = new Map();
  let comment = '';
  for (const match of body.matchAll(/\/\*([\s\S]*?)\*\/|--([\w-]+):\s*([^;]+);/g)) {
    if (match[1] !== undefined) comment = match[1].replace(/\s+/g, ' ').trim();
    else variables.set(match[2], { value: match[3].trim(), comment });
  }
  return variables;
}

// What the design system reads as a colour: hex, a colour function with no function inside, or an alias.
const COLOUR = /^(#[0-9a-f]{3,8}|(oklch|oklab|rgba?|hsla?|lab|lch)\([^()]*\)|var\(--[\w-]+\))$/i;
const COLOURISH = /^(#|oklch|oklab|rgb|hsl|lab|lch|color-mix|var\()/i;
const valueOf = (value) => value.replace(/^var\(--([\w-]+)\)$/, '{$1}');
const light = variablesOf(':root');
const dark = variablesOf('.dark');
const previous = new Map((system.color?.tokens ?? []).map((token) => [token.name, token]));

const tokens = [];
const skipped = [];
for (const name of new Set([...light.keys(), ...dark.keys()])) {
  const lightValue = light.get(name)?.value;
  const darkValue = dark.get(name)?.value;
  const values = [lightValue, darkValue].filter(Boolean);
  if (!values.some((value) => COLOURISH.test(value))) continue;
  if (!values.every((value) => COLOUR.test(value))) {
    skipped.push(name);
    continue;
  }
  const comment = (light.get(name) ?? dark.get(name)).comment;
  tokens.push({
    name,
    value:
      lightValue && darkValue && darkValue !== lightValue
        ? { light: valueOf(lightValue), dark: valueOf(darkValue) }
        : lightValue
          ? valueOf(lightValue)
          : { dark: valueOf(darkValue) },
    usage: previous.get(name)?.usage ?? (comment || 'From app/globals.css.'),
  });
}
const kept = new Set(tokens.map(({ name }) => name));
const gone = [...previous.keys()].filter((name) => !kept.has(name));

const commit = execSync("git describe --always --dirty --abbrev=7 --exclude='*'").toString().trim();
const next = {
  ...system,
  meta: {
    ...system.meta,
    source: 'github',
    repo: 'gitranks/gitranks-ui',
    ref: commit,
    status: 'live',
    synced: new Date().toISOString().slice(0, 10),
  },
  color: { ...system.color, tokens },
};
const out = join(root, '.design/system/project/tokens.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(next, null, 1)}\n`);
console.log(`${tokens.length} colours from app/globals.css @${commit}.`);
if (skipped.length) console.log(`Not readable by the design system (left out): ${skipped.join(', ')}`);
if (gone.length) console.log(`In the design system but no longer in the stylesheet (left out): ${gone.join(', ')}`);
