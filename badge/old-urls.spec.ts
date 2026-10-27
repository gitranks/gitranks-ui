import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

/**
 * Every URL the badges served before v3 keeps answering with the same bytes. The images are drawn from fixed data
 * and their hashes kept in the snapshot; a change to any of them fails here.
 */

type Doc = { definitions: { name?: { value: string } }[] };

const RANKS = {
  s: 1204,
  sProvisional: null,
  sM: 1300,
  c: 8210,
  cProvisional: null,
  cM: 8100,
  f: 512,
  fProvisional: null,
  fM: 530,
};

const tiers = (count: number) =>
  Array.from({ length: 35 }, (_, index) => {
    const tier = 7 - Math.floor(index / 5);
    const level = 5 - (index % 5);
    return { tier, level, minRank: index * count + 1, maxRank: (index + 1) * count, minValue: 100_000 - index * 2_000 };
  });

const DATA: Record<string, unknown> = {
  BadgeProfileWithRanks: {
    user: {
      githubId: 'U_1',
      avatarUrl: null,
      country: 'Ukraine',
      s: 2_480,
      c: 960,
      f: 1_310,
      snapshots: { '2026-10-01': { s: 2_400, c: 900, f: 1_300 }, '2026-09-01': { s: 2_300, c: 850, f: 1_250 } },
      rankGlobal: RANKS,
      rankCountry: { ...RANKS, s: 12, sM: 14, c: 40, cM: 41, f: 9, fM: 9 },
    },
  },
  BadgeTiers: {
    rankTiersByName: {
      sUsers: 3_300_000,
      cUsers: 1_200_000,
      fUsers: 2_100_000,
      sTiers: tiers(400),
      cTiers: tiers(400),
      fTiers: tiers(400),
    },
  },
  GlobalRankByLogin: {
    globalRankByLogin: {
      githubId: 'U_1',
      ...RANKS,
      user: { login: 'octo-dev', avatarUrl: null, s: 2_480, c: 960, f: 1_310, location: 'Kyiv' },
    },
  },
};

vi.mock('@/lib/graphql/graphql-direct', () => ({
  graphqlDirect: vi.fn(async (document: Doc) => DATA[document.definitions[0].name?.value ?? '']),
}));

vi.mock('@/badge/repo/star-history-badge.loader', () => ({
  // The API finds a repository whatever the case of its name, as the route's 308 expects.
  fetchBadgeRepo: vi.fn(async (ownerParam: string, nameParam: string) => {
    const [owner, name] = [ownerParam.toLowerCase(), nameParam.toLowerCase()];
    return owner === 'octo' && name === 'widgets'
      ? {
          nameWithOwner: 'octo/widgets',
          stars: 6_214,
          gainedThisMonth: 214,
          history: {
            points: [
              { date: '2020-03-14T00:00:00Z', stars: 0 },
              { date: '2023-01-01T00:00:00Z', stars: 2_400 },
              { date: '2026-10-01T00:00:00Z', stars: 6_000 },
            ],
            current: { date: '2026-10-20T00:00:00Z', stars: 6_214 },
          },
        }
      : owner === 'octo' && name === 'fresh'
        ? { nameWithOwner: 'octo/fresh', stars: 42, gainedThisMonth: 3, history: null }
        : null;
  }),
}));

const { GET: canonicalGet } = await import('@/app/badges/[login]/[file]/route');
const { GET: v2Get } = await import('@/app/api/badge/v2/[login]/route');
const { GET: v1Get } = await import('@/app/api/badge/[login]/route');
const { GET: starHistoryGet } = await import('@/app/repo-badges/[owner]/[name]/[file]/route');

const sha = (body: ArrayBuffer | Uint8Array) =>
  createHash('sha256')
    .update(body instanceof Uint8Array ? body : new Uint8Array(body))
    .digest('hex');

async function describeResponse(response: Response) {
  return {
    status: response.status,
    type: response.headers.get('content-type'),
    cache: response.headers.get('cache-control'),
    location: response.headers.get('location'),
    sha256: sha(await response.arrayBuffer()),
  };
}

const request = (url: string) => new NextRequest(`http://localhost${url}`);

describe('old badge URLs', () => {
  it.each([
    'stars-rank.svg',
    'contributions-rank.svg',
    'followers-rank.svg',
    'stars-score.svg',
    'contributions-score.png',
    'followers-score.svg',
    'unknown.svg',
  ])('/badges/octo-dev/%s', async (file) => {
    const response = await canonicalGet(request(`/badges/octo-dev/${file}`), {
      params: Promise.resolve({ login: 'octo-dev', file }),
    });
    expect(await describeResponse(response)).toMatchSnapshot();
  });

  it.each([
    '',
    '?type=tier&valueBgColor=%237c3aed',
    '?ranking=c&type=percentile&valueBgColor=%237f5539',
    '?ranking=f&type=score&label=Total%20Followers',
    '?meta=monthly-change&label=Stars%20Rank',
    '?meta=goal-top-10&label=Stars%20Rank',
    '?meta=goal-next-tier&labelBgColor=%23000&valueBgColor=%23fff',
    '?context=country&label=USA%20Stars%20Rank&cornerStyle=squared',
    '?context=country&ranking=f&type=tier&valueBgColor=%237c3aed',
    '?meta=percentile&v=2',
    '?type=nope',
  ])('/api/badge/v2/octo-dev%s', async (query) => {
    const response = await v2Get(request(`/api/badge/v2/octo-dev${query}`), {
      params: Promise.resolve({ login: 'octo-dev' }),
    });
    expect(await describeResponse(response)).toMatchSnapshot();
  });

  it.each(['', '?template=small', '?template=medium&theme=dark', '?template=small&rankingType=follower'])(
    '/api/badge/octo-dev%s',
    async (query) => {
      const response = await v1Get(request(`/api/badge/octo-dev${query}`), {
        params: Promise.resolve({ login: 'octo-dev' }),
      });
      expect(await describeResponse(response)).toMatchSnapshot();
    },
  );

  it.each([
    ['octo', 'widgets', 'star-history.svg'],
    ['octo', 'widgets', 'star-history.png'],
    ['octo', 'fresh', 'star-history.svg'],
    ['octo', 'unknown', 'star-history.svg'],
    ['octo', 'unknown', 'star-history.png'],
    ['Octo', 'Widgets', 'star-history.svg'],
  ])('/repo-badges/%s/%s/%s', async (owner, name, file) => {
    const response = await starHistoryGet(request(`/repo-badges/${owner}/${name}/${file}`), {
      params: Promise.resolve({ owner, name, file }),
    });
    expect(await describeResponse(response)).toMatchSnapshot();
  });

  it('keeps the 23 static badge files', async () => {
    const dir = path.join(process.cwd(), 'public', 'badges');
    const files = (await readdir(dir)).sort();
    const hashes = Object.fromEntries(
      await Promise.all(files.map(async (file) => [file, sha(await readFile(path.join(dir, file)))])),
    );

    expect(files).toHaveLength(23);
    expect(hashes).toMatchSnapshot();
  });
});
