import { describe, expect, it } from 'vitest';

import { GALLERY_BADGES } from './gallery-badges';
import { findBadge } from '@/badge/v3/catalogue';
import type { OrgFacts, RepoFacts, UserFacts } from '@/badge/v3/facts';
import { NOW, orgBig, repoBig, userBig } from '@/badge/v3/fixtures';
import { resolveParams } from '@/badge/v3/params';
import { availableChoices, badgeTiles } from '@/badge/v3/tiles';
import type { EntityKind } from '@/badge/v3/types';

const KINDS: EntityKind[] = ['user', 'repo', 'org'];

/** Today's #1 of each ranking as the gallery draws it: rank 1, and so no rank goal. */
const userTop: UserFacts = {
  ...userBig,
  rankGlobal: { ...userBig.rankGlobal!, s: 1, sM: 1 },
  rankCountry: { ...userBig.rankCountry!, s: 1, sM: 1 },
  rankGoal: { s: null, c: null, f: null },
};
const repoTop: RepoFacts = { ...repoBig, rank: { ...repoBig.rank!, s: 1, sM: 1, l: 1, lM: 1 }, rankGoal: null };
const orgTop: OrgFacts = { ...orgBig, rank: { s: 1, sM: 1 } };

describe('gallery badges', () => {
  it.each(KINDS)('names %s badges of the catalogue with queries they take', (kind) => {
    for (const { id, query } of GALLERY_BADGES[kind]) {
      const badge = findBadge(kind, id);
      expect(badge, `${kind} ${id}`).not.toBeNull();
      if (badge) expect(() => resolveParams(badge, query ?? {})).not.toThrow();
    }
  });

  it('shows no tier badge, no rank goal, and no contributors wall for developers', () => {
    const ids = KINDS.flatMap((kind) => GALLERY_BADGES[kind].map(({ id }) => id));
    expect(ids.filter((id) => id.includes('tier') || id === 'goal')).toEqual([]);
    expect(GALLERY_BADGES.user.map(({ id }) => id)).not.toContain('contributors-wall');
  });

  it("draws the full set for each kind's #1", () => {
    expect(badgeTiles(userTop, availableChoices(userTop, GALLERY_BADGES.user, NOW), NOW).map(({ key }) => key)).toEqual(
      ['rank', 'rank?scope=country', 'language-rank', 'rank?by=contributions', 'profile-card', 'count-chart'],
    );
    expect(badgeTiles(repoTop, availableChoices(repoTop, GALLERY_BADGES.repo, NOW), NOW).map(({ key }) => key)).toEqual(
      [
        'rank',
        'language-rank',
        'starred-by',
        'stars',
        'rank-card',
        'starred-by-card',
        'star-history',
        'contributors-wall?rows=2',
      ],
    );
    expect(availableChoices(orgTop, GALLERY_BADGES.org, NOW).map(({ id }) => id)).toEqual([
      'rank',
      'top-repo',
      'contributors',
      'stars',
      'org-card',
      'contributors-chart',
      'contributors-wall',
    ]);
  });

  it('draws walls two rows high, at their drawn size', () => {
    const [wall] = badgeTiles(repoTop, GALLERY_BADGES.repo.slice(-1), NOW);
    expect(wall.src.light).toBe('/badge/repo/nebula/ui/contributors-wall.svg?rows=2&theme=light');
    expect(wall.size).toEqual({ width: 800, height: 206 });
  });
});
