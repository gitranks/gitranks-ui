import { describe, expect, it } from 'vitest';

import { README_BADGES, README_SHIELDS, readmeContent } from './readme-badges';
import { findBadge } from '@/badge/v3/catalogue';
import type { OrgFacts, RepoFacts, UserFacts } from '@/badge/v3/facts';
import { NOW, orgBig, repoBig, repoMid, userBig, userMid, userUnranked } from '@/badge/v3/fixtures';
import { resolveParams } from '@/badge/v3/params';
import type { EntityKind } from '@/badge/v3/types';

const KINDS: EntityKind[] = ['user', 'repo', 'org'];

const decode = (value: string) => value.replaceAll('&amp;', '&');

/** Today's #1 of each ranking, as the showcase reads it: rank 1, and so no rank goal. */
const userTop: UserFacts = {
  ...userBig,
  rankGlobal: { ...userBig.rankGlobal!, s: 1, sM: 1 },
  rankCountry: { ...userBig.rankCountry!, s: 1, sM: 1 },
  rankGoal: { s: null, c: null, f: null },
};
const repoTop: RepoFacts = { ...repoBig, rank: { ...repoBig.rank!, s: 1, sM: 1, l: 1, lM: 1 }, rankGoal: null };
const orgTop: OrgFacts = { ...orgBig, rank: { s: 1, sM: 1 } };

describe('README badges', () => {
  it.each(KINDS)('names %s badges of the catalogue with queries they take', (kind) => {
    const { shields, card } = README_BADGES[kind];
    for (const { id, query } of [...shields, ...(card ? [card] : [])]) {
      const badge = findBadge(kind, id);
      expect(badge, `${kind} ${id}`).not.toBeNull();
      if (badge) expect(() => resolveParams(badge, query ?? {})).not.toThrow();
    }
  });

  it('promotes no tier badge', () => {
    const ids = KINDS.flatMap((kind) => {
      const { shields, card } = README_BADGES[kind];
      return [...shields, ...(card ? [card] : [])].map(({ id }) => id);
    });
    expect(ids.filter((id) => id.includes('tier'))).toEqual([]);
  });

  it("draws each #1's first available shields, skipping the ones it does not have", () => {
    expect(readmeContent(userTop, 'find', NOW)?.shields.map(({ key }) => key)).toEqual([
      'rank',
      'language-rank',
      'month',
    ]);
    // No goal for a #1: the next badge takes its place.
    expect(readmeContent(repoTop, 'find', NOW)?.shields.map(({ key }) => key)).toEqual([
      'language-rank',
      'starred-by',
      'month',
    ]);
    expect(readmeContent(orgTop, 'find', NOW)?.shields.map(({ key }) => key)).toEqual([
      'rank',
      'contributors',
      'contributors?value=new',
    ]);
  });

  it(`keeps at most ${README_SHIELDS} shields, and a card for developers only`, () => {
    for (const entity of [userBig, userMid, repoBig, repoMid, orgBig]) {
      const content = readmeContent(entity, 'embed', NOW);
      expect(content?.shields.length).toBeLessThanOrEqual(README_SHIELDS);
      expect(content?.shields.every(({ format }) => format === 'shield')).toBe(true);
      expect(!!content?.card).toBe(entity.kind === 'user');
    }
    expect(readmeContent(userBig, 'embed', NOW)?.card?.key).toBe('profile-card');
  });

  it("leads a visitor's own badge to its code, and a showcase badge to making it for one's own", () => {
    const own = readmeContent(userMid, 'embed', NOW);
    expect(own?.name).toBe(userMid.login);
    expect(decode(own?.shields[0].href ?? '')).toBe(`/badge/builder?user=${userMid.login}&badge=rank&step=embed`);

    const showcase = readmeContent(repoTop, 'find', NOW);
    expect(showcase?.shields[0].href).toBe('/badge/builder?repo=&badge=language-rank');
  });

  it('states the fact in every alt text', () => {
    const content = readmeContent(userTop, 'find', NOW);
    for (const tile of [...(content?.shields ?? []), ...(content?.card ? [content.card] : [])]) {
      expect(tile.alt).toMatch(new RegExp(`^${userTop.login} on GitRanks: .+`));
      expect(tile.alt).not.toBe(`${userTop.login} on GitRanks: `);
    }
  });

  it('gives nothing for an entity without a shield to show', () => {
    expect(readmeContent(userUnranked, 'embed', NOW)).toBeNull();
  });
});
