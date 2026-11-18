// The app's stylesheet for the screen catalogue's boards: app/globals.css through Tailwind, from this checkout's code.
// The last step of `pnpm design:export`, so it also prints how many live files the export drew.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import tailwind from '@tailwindcss/postcss';
import postcss from 'postcss';

import { FILES_AIM, FILES_CAP } from './design-canvas-files.mjs';

const root = process.cwd();
const from = join(root, 'app/globals.css');
const to = join(root, '.design/project/current/gitranks.css');
const { css } = await postcss([tailwind({ base: root })]).process(readFileSync(from, 'utf8'), { from, to });
mkdirSync(dirname(to), { recursive: true });
writeFileSync(to, css);
console.log(`${to} (${Math.round(css.length / 1024)} KB)`);

// The live files a redraw publishes: the boards, their images and this stylesheet.
const { boards, images } = JSON.parse(readFileSync(join(root, '.design/boards.json'), 'utf8'));
const files = Object.keys(boards).length + images.length + 1;
console.log(`${files} live files: ${Object.keys(boards).length} boards, ${images.length} images, 1 stylesheet.`);
if (files > FILES_AIM) {
  console.warn(`Warning: above ${FILES_AIM} live files; the canvas holds at most ${FILES_CAP} files a version.`);
}
