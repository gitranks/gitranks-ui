import { renderToReadableStream } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

import type { DesignGlobals, Screen } from './registry';

// The screens the export leaves out (`exported: false`) are drawn nowhere else: this draws each of their states as the
// export would, in memory, so a state that throws fails here. It writes no file. They are drawn for the pages that will
// use them, so with every Learn page their links lead to built.

vi.mock('@/lib/learn/built-pages', () => ({
  LEARN_ISSUES_PAGE_BUILT: true,
  LEARN_PROJECT_COURSE_PAGE_BUILT: true,
  LEARN_FIXES_PAGE_BUILT: true,
  LEARN_APPROVE_PAGE_BUILT: true,
  LEARN_ANSWERS_SHARE_SWITCH_ON: true,
}));

/** A state's markup as the server sends it, its async parts awaited. */
async function markupOf(state: Screen['states'][number]): Promise<string> {
  Object.assign(globalThis as DesignGlobals, {
    __designPath: state.path.split('?')[0],
    __designParams: {},
    __designSearch: state.path.split('?')[1] ?? '',
    __designSignedOut: !!state.signedOut,
  });
  const stream = await renderToReadableStream(state.render());
  await stream.allReady;
  return new Response(stream).text();
}

it('draws every state of every screen held back from the export', async () => {
  // The design setup's mocks first, then the screens, which they must apply to.
  await import('./setup');
  const { HELD_BACK_SCREENS } = await import('./screens/held-back');
  expect(HELD_BACK_SCREENS.length).toBeGreaterThan(0);
  for (const screen of HELD_BACK_SCREENS) {
    expect(screen.exported, screen.id).toBe(false);
    for (const state of screen.states) {
      const html = await markupOf(state);
      expect(html.length, `${screen.id}/${state.id}`).toBeGreaterThan(500);
      // No long dash in what a person reads.
      expect(html, `${screen.id}/${state.id}`).not.toContain('—');
    }
  }
}, 60_000);
