import { cacheLife } from 'next/cache';

import { HOURLY } from './landing-data';
import { type ReadmeContent, readmeContent } from './readme-badges';
import { fetchShowcaseNames, loadShowcase } from '@/app/badge/gallery/gallery-showcase';
import type { EntityKind } from '@/badge/v3/types';

export type ReadmeShowcase = Record<EntityKind, ReadmeContent | null>;

const KINDS: readonly EntityKind[] = ['user', 'repo', 'org'];

/**
 * The README mock's content for every visitor: today's #1 developer, repository and organization, as the badge
 * gallery shows them and from the same cached reads. A kind whose #1 cannot be read is `null` and comes back within
 * minutes; so does a badge that waits on a read and carries the render's stamp (see `pendingQuery`).
 */
export async function fetchReadmeShowcase(): Promise<ReadmeShowcase> {
  'use cache';

  const { names, ok: namesOk } = await fetchShowcaseNames();
  const showcases = await Promise.all(KINDS.map((kind) => loadShowcase(kind, names[kind])));
  const now = new Date();
  const contents = showcases.map(({ facts }) => (facts ? readmeContent(facts, 'find', now) : null));

  if (namesOk && showcases.every(({ ok }) => ok) && contents.every((content) => content && !content.pending)) {
    cacheLife(HOURLY);
  } else {
    cacheLife('minutes');
  }

  return { user: contents[0], repo: contents[1], org: contents[2] };
}
