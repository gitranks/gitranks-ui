// Lays the exported boards out on the designs canvas. It reads the canvas's index as it is now, replaces its live
// boards (`current/`) and their titles (notes `current-…`) with the ones `pnpm design:export` drew, and keeps
// everything else: proposals, people's notes, pages, the design system. Proposals and notes in a page's proposal
// column move with the row they sit beside when the live rows move or widen.
//
// Live boards come from main only: run it on a clean checkout of origin/main (`git fetch` first).
//
// node scripts/design-canvas.mjs <project/canvas.json read from the canvas>
//   → .design/project/canvas.json, and .design/publish.json: the `files` to send with it.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), '.design');
const git = (command) => execSync(`git ${command}`).toString().trim();
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const live = process.argv[2];
if (!live || !existsSync(live)) fail('Pass the canvas.json read from the canvas (Artifact read, path project/canvas.json).');
if (git('rev-parse HEAD') !== git('rev-parse origin/main') || git('status --porcelain')) {
  fail(
    'Live boards come from main only: run this on a clean checkout of origin/main. To design on an unmerged screen, ' +
      'copy its board from .design/project/current/ into proposals/<slug>/ instead.',
  );
}
const canvas = JSON.parse(readFileSync(live, 'utf8'));
const { commit, boards } = JSON.parse(readFileSync(join(OUT, 'boards.json'), 'utf8'));
if (commit.endsWith('-dirty')) fail('The export came from a checkout with changes: run pnpm design:export again here.');

const GAP_X = 80;
const TITLE_ABOVE = 260;
const GAP_Y = 120;
const CURRENT = 'current/';
const NOTE = 'current-';
const isCurrent = (path) => path.startsWith(CURRENT);
const screenOf = (path) => path.split('/').at(-1).split('--')[0];
/** Where a page's proposal column starts: clear of its widest live row. */
const proposalsXOf = (widest) => Math.ceil((widest + 400) / 1000) * 1000;

const listed = Object.keys(boards);
const removed = Object.keys(canvas.boards ?? {}).filter((path) => isCurrent(path) && !boards[path]);
const others = Object.entries(canvas.boards ?? {}).filter(([path]) => !isCurrent(path));
const otherNotes = Object.entries(canvas.notes ?? {}).filter(([id]) => !id.startsWith(NOTE));

// The live rows as the canvas has them now, per page: each screen's top, and the widest row.
const before = new Map();
for (const [path, board] of Object.entries(canvas.boards ?? {})) {
  if (!isCurrent(path)) continue;
  const page = before.get(board.page) ?? { rows: new Map(), widest: 0 };
  const screen = screenOf(path);
  page.rows.set(screen, Math.min(page.rows.get(screen) ?? Number.POSITIVE_INFINITY, board.y));
  page.widest = Math.max(page.widest, board.x + board.w);
  before.set(board.page, page);
}

// The live rows as the catalogue draws them: each area's screens top down, each screen's states left to right.
const placed = {};
const notes = {};
const after = new Map();
const byArea = new Map();
for (const [path, board] of Object.entries(boards)) {
  const screens = byArea.get(board.area) ?? new Map();
  screens.set(board.screen, [...(screens.get(board.screen) ?? []), [path, board]]);
  byArea.set(board.area, screens);
}
for (const [area, screens] of byArea) {
  const page = { rows: new Map(), widest: 0 };
  let y = TITLE_ABOVE + 200;
  for (const [screen, states] of screens) {
    const first = states[0][1];
    let x = 0;
    for (const [path, board] of states) {
      placed[path] = {
        x,
        y,
        w: board.width,
        h: board.height,
        // A row of one board carries its route in its own name; a longer row gets a title above it.
        title: states.length === 1 ? `${board.title} · ${board.route}` : board.title,
        page: area,
        ...(board.width >= 1024 ? { expand: 'fill' } : {}),
      };
      x += board.width + GAP_X;
    }
    if (states.length > 1) {
      notes[`${NOTE}${screen}`] = {
        x: 0,
        y: y - TITLE_ABOVE,
        text: `${first.screenTitle} · ${first.route}`,
        kind: 'title1',
        maxW: x - GAP_X,
        page: area,
      };
    }
    page.rows.set(screen, y);
    page.widest = Math.max(page.widest, x - GAP_X);
    y += Math.max(...states.map(([, board]) => board.height)) + GAP_Y + TITLE_ABOVE;
  }
  after.set(area, page);
  notes[`${NOTE}about-${area}`] = {
    x: -560,
    y: TITLE_ABOVE + 200,
    w: 440,
    text:
      `Live boards: drawn from gitranks-ui main @${commit} by pnpm design:export. Don't edit them. ` +
      `Proposals go right of the screen they change, from x ${proposalsXOf(page.widest)}, under proposals/<slug>/, ` +
      'with a note: what, why, status.',
    fill: 'gray',
    page: area,
  };
}

/** A proposal or note in a page's proposal column follows its row (a note in the gap above a row is that row's): down when the row moved, right when rows widened. */
function follow(item) {
  const old = before.get(item.page);
  const now = after.get(item.page);
  if (!old || !now) return item;
  const column = proposalsXOf(old.widest);
  if (item.x < column) return item;
  const row = [...old.rows].filter(([, top]) => top <= item.y + TITLE_ABOVE).sort(([, a], [, b]) => b - a)[0];
  const dy = row && now.rows.has(row[0]) ? now.rows.get(row[0]) - row[1] : 0;
  return { ...item, x: item.x + proposalsXOf(now.widest) - column, y: item.y + dy };
}
for (const [path, board] of others) placed[path] = follow(board);
for (const [id, note] of otherNotes) notes[id] = follow(note);

// The catalogue's areas first, then the pages people made, Archive last.
const areaPages = [...byArea.keys()].map((id) => ({ id, name: Object.values(boards).find((b) => b.area === id).areaName }));
const pages = [
  ...areaPages,
  ...(canvas.pages ?? []).filter(({ id }) => !byArea.has(id) && id !== 'archive'),
  { id: 'archive', name: 'Archive' },
];

const order = [...listed, ...(canvas.order ?? []).filter((path) => !isCurrent(path) && placed[path])];
writeFileSync(
  join(OUT, 'project/canvas.json'),
  `${JSON.stringify({ ...canvas, pages, boards: placed, order, notes }, null, 1)}\n`,
);

const files = Object.fromEntries([
  ['project/current/gitranks.css', 'project/current/gitranks.css'],
  ...listed.map((path) => [`project/${path}`, `project/${path}`]),
  ...removed.map((path) => [`project/${path}`, null]),
]);
writeFileSync(join(OUT, 'publish.json'), `${JSON.stringify(files, null, 1)}\n`);
console.log(`${listed.length} live boards, ${removed.length} removed; ${others.length} other boards kept.`);
console.log('Publish: root .design, file_path .design/project/canvas.json, files from .design/publish.json.');
