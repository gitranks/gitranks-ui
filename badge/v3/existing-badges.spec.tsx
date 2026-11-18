import { createHash } from 'node:crypto';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { badgesOf } from './catalogue';
import type { EntityFacts } from './facts';
import { getEntityFactsResponse } from './facts-route';
import {
  NOW,
  orgBig,
  orgMid,
  orgSmall,
  orgUnranked,
  repoBig,
  repoMid,
  repoSmall,
  repoUnranked,
  userBig,
  userMid,
  userSmall,
  userUnranked,
} from './fixtures';
import { promotedBadges } from './promotion';
import { type BadgeLoaders, getBadgeResponse, parseEntityRef } from './route';
import { badgeTiles } from './tiles';
import type { EntityKind } from './types';
import { BadgesCard } from '@/components/badges-card/badges-card';

// Avatars are never fetched here: every one draws as the grey disk.
vi.mock('./avatars', () => ({
  fetchAvatar: async () => null,
  fetchAvatars: async (urls: unknown[]) => urls.map(() => null),
}));

/**
 * The badges of developers, organizations and repositories, pinned: every image's status, headers and bytes, the
 * builder's facts, the tiles and the Badges card, as they were before another kind of entity joined them. A change
 * to any of them shows here as a changed hash.
 */

const KINDS: readonly EntityKind[] = ['user', 'org', 'repo'];

const ENTITIES: Record<string, EntityFacts> = {
  repoSmall,
  repoMid,
  repoBig,
  repoUnranked,
  userSmall,
  userMid,
  userBig,
  userUnranked,
  orgSmall,
  orgMid,
  orgBig,
  orgUnranked,
};

const QUERIES = ['', 'scheme=night', 'scheme=auto&theme=dark', 'logo=0&scheme=classic', 'theme=light'];

const hash = (body: string | Uint8Array) => createHash('sha256').update(body).digest('hex').slice(0, 16);

const nameOf = (entity: EntityFacts) =>
  entity.kind === 'repo' ? entity.nameWithOwner : entity.kind === 'package' ? entity.name : entity.login;

const loadersFor = (entity: EntityFacts): BadgeLoaders => ({
  user: async (login) => (entity.kind === 'user' && entity.login.toLowerCase() === login.toLowerCase() ? entity : null),
  org: async (login) => (entity.kind === 'org' && entity.login.toLowerCase() === login.toLowerCase() ? entity : null),
  repo: async (owner, name) =>
    entity.kind === 'repo' && entity.nameWithOwner.toLowerCase() === `${owner}/${name}`.toLowerCase() ? entity : null,
});

const refOf = (entity: EntityFacts, spelled = nameOf(entity)) => {
  if (entity.kind === 'repo') {
    const [owner, name] = spelled.split('/');
    return parseEntityRef('repo', { owner, name });
  }
  return parseEntityRef(entity.kind as 'user' | 'org', { login: spelled });
};

async function answer(entity: EntityFacts, file: string, query: string, spelled?: string) {
  const response = await getBadgeResponse(
    refOf(entity, spelled),
    file,
    new URLSearchParams(query),
    loadersFor(entity),
    NOW,
  );
  const body = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    headers: Object.fromEntries([...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b))),
    body: hash(body),
  };
}

describe('existing badges', () => {
  it('keep the catalogue of developers, organizations and repositories', () => {
    expect(KINDS.flatMap((kind) => badgesOf(kind)).map((badge) => JSON.stringify(badge))).toMatchSnapshot();
  });

  it.each(Object.entries(ENTITIES))('%s: every image answers the same bytes and headers', async (_, entity) => {
    const answers: Record<string, unknown> = {};
    for (const badge of badgesOf(entity.kind)) {
      for (const query of QUERIES) {
        answers[`${badge.id}.svg?${query}`] = await answer(entity, `${badge.id}.svg`, query);
      }
    }
    expect(answers).toMatchSnapshot();
  });

  it.each(Object.entries(ENTITIES))('%s: a PNG, a social card and a redirect answer the same', async (_, entity) => {
    const [first] = badgesOf(entity.kind);
    const card = badgesOf(entity.kind).find(({ format }) => format === 'card');
    expect({
      png: await answer(entity, `${first.id}.png`, ''),
      social: card ? await answer(entity, `${card.id}.png`, 'size=social') : null,
      upper: await answer(entity, `${first.id}.svg`, 'scheme=night', nameOf(entity).toUpperCase()),
      unknown: await answer(entity, 'no-such-badge.svg', ''),
      invalid: await answer(entity, `${first.id}.svg`, 'scheme=nope'),
    }).toMatchSnapshot();
  });

  it.each(Object.entries(ENTITIES))("%s: the builder's facts answer the same", async (_, entity) => {
    const response = await getEntityFactsResponse(entity.kind, nameOf(entity).split('/'), loadersFor(entity));
    expect({
      status: response.status,
      cacheControl: response.headers.get('Cache-Control'),
      body: hash(await response.text()),
    }).toMatchSnapshot();
  });

  it.each(Object.entries(ENTITIES))('%s: the tiles and the Badges card are the same', (_, entity) => {
    const tiles = badgeTiles(entity, promotedBadges(entity, NOW), NOW);
    expect({
      tiles,
      gallery: badgeTiles(entity, promotedBadges(entity, NOW), NOW, 'find').map(({ href }) => href),
      card: hash(renderToStaticMarkup(<BadgesCard entity={entity} now={NOW} />)),
    }).toMatchSnapshot();
  });
});
