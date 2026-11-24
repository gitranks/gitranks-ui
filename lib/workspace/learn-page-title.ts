import type { Metadata } from 'next';

import { loadWorkspaceGate } from './gate.data';

/** The title a visitor reads above the sign-in card of a Learn page under `/my`. */
export const SIGN_IN_TITLE = 'Sign in';

/**
 * A Learn page's title under `/my` (Your progress, a lesson, Goal and level), which names the page only to an account
 * the workspace is open to: a visitor reads the sign-in card under `SIGN_IN_TITLE`, anyone else (they get the 404) the
 * site's own title. Read from the gate the layout and the page already read once per request; a failed read names
 * nothing.
 */
export async function learnPageMetadata(title: string): Promise<Metadata> {
  const gate = await loadWorkspaceGate().catch(() => null);
  if (gate?.kind === 'open') return { title };
  return gate?.kind === 'signed-out' ? { title: SIGN_IN_TITLE } : {};
}
