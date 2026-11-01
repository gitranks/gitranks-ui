import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { it } from 'vitest';

import { boardOf, boardPathOf } from './board';
import { AREAS } from './registry';
import { SCREENS } from './screens';

const OUT = join(process.cwd(), '.design');

it('exports the screens', () => {
  // The commit the boards come from; `-dirty` when the checkout has changes, which the canvas never takes as live.
  const commit = execSync("git describe --always --dirty --abbrev=7 --exclude='*'").toString().trim();
  const boards: Record<string, Record<string, string | number>> = {};
  for (const screen of SCREENS) {
    for (const state of screen.states) {
      const path = boardPathOf(screen, state);
      (globalThis as { __designPath?: string }).__designPath = state.path;
      const file = join(OUT, 'project', path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, boardOf(screen, state, renderToStaticMarkup(state.render()), commit));
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
      };
    }
  }
  writeFileSync(join(OUT, 'boards.json'), `${JSON.stringify({ commit, boards }, null, 2)}\n`);
});
