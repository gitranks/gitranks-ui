import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { it } from 'vitest';

import { boardOf, boardPathOf } from './board';
import { AREAS } from './registry';
import { SCREENS } from './screens';

const OUT = join(process.cwd(), '.design');
const only = process.env.DESIGN_SCREENS?.split(',').filter(Boolean);

it('exports the screens', () => {
  const commit = execSync('git rev-parse --short HEAD').toString().trim();
  const boards: Record<string, Record<string, string | number>> = {};
  // Every board is listed, so the canvas keeps one layout; only the screens asked for are drawn.
  for (const screen of SCREENS) {
    const drawn = !only || only.includes(screen.id);
    for (const state of screen.states) {
      const path = boardPathOf(screen, state);
      if (drawn) {
        (globalThis as { __designPath?: string }).__designPath = state.path;
        const file = join(OUT, 'project', path);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, boardOf(screen, state, renderToStaticMarkup(state.render()), commit));
      }
      boards[path] = {
        area: screen.area,
        areaName: AREAS[screen.area],
        screen: screen.id,
        screenTitle: screen.title,
        route: screen.route,
        state: state.id,
        title: `${screen.title} · ${state.title}`,
        width: state.width ?? 1280,
        height: state.height,
        drawn: drawn ? 1 : 0,
      };
    }
  }
  writeFileSync(join(OUT, 'boards.json'), `${JSON.stringify({ commit, boards }, null, 2)}\n`);
});
