import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { ReactElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { it } from 'vitest';

import { boardOf, boardPathOf } from './board';
import { drawImages } from './images';
import { AREAS } from './registry';
import { SCREENS } from './screens';

const OUT = join(process.cwd(), '.design');

/** What the mocks in `setup.tsx` read: the state's path, params and query, and who is looking. */
type DesignGlobals = {
  __designPath?: string;
  __designParams?: Record<string, string>;
  __designSearch?: string;
  __designSignedOut?: boolean;
};

/** The route's params at a path: `/profile/[login]` at `/profile/octo-dev` is `{ login: 'octo-dev' }`. */
const paramsOf = (route: string, pathname: string) => {
  const parts = pathname.split('/');
  return Object.fromEntries(
    route.split('/').flatMap((segment, index) => {
      const name = /^\[+(?:\.\.\.)?(\w+)\]+$/.exec(segment)?.[1];
      return name && parts[index] ? [[name, decodeURIComponent(parts[index])]] : [];
    }),
  );
};

/**
 * A state's markup as the server sends it, its async server components awaited, without React's own comments and
 * preload hints.
 */
async function markupOf(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  const html = await new Response(stream).text();
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<link rel="preload"[^>]*>/g, '');
}

const write = (path: string, content: string) => {
  const file = join(OUT, 'project', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

it('exports the screens', async () => {
  // The commit the boards come from; `-dirty` when the checkout has changes, which the canvas never takes as live.
  const commit = execSync("git describe --always --dirty --abbrev=7 --exclude='*'").toString().trim();
  const boards: Record<string, Record<string, string | number>> = {};
  const images = new Set<string>();
  for (const screen of SCREENS) {
    for (const state of screen.states) {
      const path = boardPathOf(screen, state);
      const [pathname, search = ''] = state.path.split('?');
      Object.assign(globalThis as DesignGlobals, {
        __designPath: pathname,
        __designParams: paramsOf(screen.route, pathname),
        __designSearch: search,
        __designSignedOut: !!state.signedOut,
      });
      const drawn = await drawImages(await markupOf(state.render()), path);
      for (const [image, svg] of drawn.images) {
        write(image, svg);
        images.add(image);
      }
      write(path, boardOf(screen, state, drawn.markup, commit));
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
  writeFileSync(
    join(OUT, 'boards.json'),
    `${JSON.stringify({ commit, boards, images: [...images].sort() }, null, 2)}\n`,
  );
});
