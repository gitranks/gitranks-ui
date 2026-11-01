// Lays the exported boards out on the designs canvas: reads the canvas's index as it is now, replaces its `current/`
// boards and their notes with the ones `design:export` drew, and keeps everything else (proposals, people's notes,
// pages, the design system) as it is. Writes `.design/project/canvas.json` and `.design/publish.json`, the files to send.
//
// node scripts/design-canvas.mjs <the live project/canvas.json, read from the canvas>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), '.design');
const live = process.argv[2];
if (!live || !existsSync(live)) {
  console.error('Pass the canvas.json read from the canvas (Artifact read, path project/canvas.json).');
  process.exit(1);
}
const canvas = JSON.parse(readFileSync(live, 'utf8'));
const { commit, boards } = JSON.parse(readFileSync(join(OUT, 'boards.json'), 'utf8'));

const GAP_X = 80;
const TITLE_ABOVE = 260;
const GAP_Y = 120;
const CURRENT = 'current/';
const isCurrent = (path) => path.startsWith(CURRENT);
const listed = new Set(Object.keys(boards));
const drawn = Object.keys(boards).filter((path) => boards[path].drawn);

// Live boards the catalogue no longer has are removed; everything else people put on the canvas stays.
const removed = Object.keys(canvas.boards ?? {}).filter((path) => isCurrent(path) && !listed.has(path));
const placed = Object.fromEntries(Object.entries(canvas.boards ?? {}).filter(([path]) => !isCurrent(path)));
const notes = Object.fromEntries(Object.entries(canvas.notes ?? {}).filter(([id]) => !id.startsWith('current-')));

// One page per area, in the catalogue's order, ahead of the pages people made; Archive last.
const pages = [...(canvas.pages ?? [])];
for (const { area, areaName } of Object.values(boards)) {
  if (!pages.some(({ id }) => id === area)) pages.push({ id: area, name: areaName });
}
if (!pages.some(({ id }) => id === 'archive')) pages.push({ id: 'archive', name: 'Archive' });
pages.sort((a, b) => (a.id === 'archive') - (b.id === 'archive'));

// Each area's screens as rows, top down, in the catalogue's order; each screen's states left to right. The layout comes
// from the whole catalogue, so redrawing one screen never moves another.
const byArea = new Map();
for (const [path, board] of Object.entries(boards)) {
  const screens = byArea.get(board.area) ?? new Map();
  screens.set(board.screen, [...(screens.get(board.screen) ?? []), [path, board]]);
  byArea.set(board.area, screens);
}
for (const [area, screens] of byArea) {
  let y = TITLE_ABOVE + 200;
  for (const [screen, states] of screens) {
    let x = 0;
    for (const [path, board] of states) {
      placed[path] = {
        x,
        y,
        w: board.width,
        h: board.height,
        title: board.title,
        page: area,
        ...(board.width >= 1024 ? { expand: 'fill' } : {}),
      };
      x += board.width + GAP_X;
    }
    const first = states[0][1];
    notes[`current-${screen}`] = {
      x: 0,
      y: y - TITLE_ABOVE,
      text: `${first.screenTitle} · ${first.route}`,
      kind: 'title1',
      maxW: x - GAP_X,
      page: area,
    };
    y += Math.max(...states.map(([, board]) => board.height)) + GAP_Y + TITLE_ABOVE;
  }
  notes[`current-about-${area}`] = {
    x: -560,
    y: TITLE_ABOVE + 200,
    w: 440,
    text: `Live boards: drawn from gitranks-ui @${commit} by pnpm design:export. Don't edit them. A proposal goes to the right of the screen it changes (x from 4000), under proposals/<slug>/, with a note: what, why, status.`,
    fill: 'gray',
    page: area,
  };
}

const order = [
  ...Object.keys(placed).filter(isCurrent),
  ...(canvas.order ?? []).filter((path) => !isCurrent(path) && placed[path]),
];
const next = { ...canvas, pages, boards: placed, order, notes };
writeFileSync(join(OUT, 'project/canvas.json'), `${JSON.stringify(next, null, 1)}\n`);

const files = Object.fromEntries([
  ['project/current/gitranks.css', 'project/current/gitranks.css'],
  ...drawn.map((path) => [`project/${path}`, `project/${path}`]),
  ...removed.map((path) => [`project/${path}`, null]),
]);
writeFileSync(join(OUT, 'publish.json'), `${JSON.stringify(files, null, 1)}\n`);
console.log(`${drawn.length} boards drawn, ${removed.length} removed, ${listed.size} live in all.`);
console.log(`Publish: root .design, file_path .design/project/canvas.json, files from .design/publish.json.`);
