// The app's stylesheet for the screen catalogue's boards: app/globals.css through Tailwind, from this checkout's code.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';

const root = process.cwd();
const from = join(root, 'app/globals.css');
const to = join(root, '.design/project/current/gitranks.css');
const { css } = await postcss([tailwind({ base: root })]).process(readFileSync(from, 'utf8'), { from, to });
mkdirSync(dirname(to), { recursive: true });
writeFileSync(to, css);
console.log(`${to} (${Math.round(css.length / 1024)} KB)`);
