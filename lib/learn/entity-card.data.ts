import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { type LearnEntityCard, learnEntityCardOf } from './entity-card';
import { LearnEntityCardDocument } from './entity-card.documents';
import { type LearnProject, learnEntityTag } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** How long a page waits for its Learn card: a slower answer draws the page without it, as a failed one does. */
export const LEARN_ENTITY_CARD_TIMEOUT_MS = 2_000;

/** The card, or none; `ok` is false when the read failed or was too slow, so the page is kept only briefly. */
export type LearnEntityCardRead = { card: LearnEntityCard | null; ok: boolean };

/**
 * The card's read, by its project in lower case, under the project's own tag, which the API expires when the card
 * changes. Kept for hours; a failure is decided inside, kept for minutes and never thrown, so it cannot fail the page
 * around it.
 */
async function readLearnEntityCard(project: LearnProject, tag: string): Promise<LearnEntityCardRead> {
  'use cache';
  cacheTag(tag);
  try {
    const { learnEntityCard } = await graphqlDirect(LearnEntityCardDocument, project, {
      source: 'ssr',
      signal: AbortSignal.timeout(LEARN_ENTITY_CARD_TIMEOUT_MS),
    });
    cacheLife('hours');
    return { card: learnEntityCardOf(learnEntityCard), ok: true };
  } catch {
    cacheLife('minutes');
    return { card: null, ok: false };
  }
}

/** A project in lower case, with its card's tag; null for one no tag can name, which has no card. */
function keyOf(project: LearnProject): { project: LearnProject; tag: string } | null {
  const lower: LearnProject =
    project.repo !== undefined ? { repo: project.repo.toLowerCase() } : { org: project.org.toLowerCase() };
  try {
    return { project: lower, tag: learnEntityTag(lower) };
  } catch {
    return null;
  }
}

/**
 * The Learn card of a repository (`owner/name`) or an organisation (its login), the same for everyone: every
 * spelling of a project shares one kept read. Null when the API has nothing to show for it.
 */
export async function loadLearnEntityCard(project: LearnProject): Promise<LearnEntityCardRead> {
  const key = keyOf(project);
  if (!key) return { card: null, ok: true };
  return readLearnEntityCard(key.project, key.tag);
}
