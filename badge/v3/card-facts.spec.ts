import { describe, expect, it, vi } from 'vitest';

import { readBadgeFacts, toOrgCardFacts, toRepoCardFacts, toUserCardFacts } from './card-facts';
import { NOW, orgBig, repoBig, repoMid, userBig, userMid } from './fixtures';
import { promotedBadges } from './promotion';
import { badgeTiles } from './tiles';

const ranks = (s: number | null, c: number | null) => ({
  s,
  c,
  f: null,
  sM: s,
  cM: c,
  fM: null,
  sProvisional: null,
  cProvisional: null,
  fProvisional: null,
});

describe('readBadgeFacts', () => {
  it('passes the facts through, and a null result as none', async () => {
    expect(await readBadgeFacts(Promise.resolve(repoBig))).toEqual({ facts: repoBig, ok: true, brief: false });
    expect(await readBadgeFacts(Promise.resolve(null))).toEqual({ facts: null, ok: true, brief: false });
    expect(await readBadgeFacts(null)).toEqual({ facts: null, ok: true, brief: false });
  });

  it('keeps a page whole without a star history: its promoted badges draw without it', async () => {
    expect(repoMid.history).toBeNull();
    expect(await readBadgeFacts(Promise.resolve(repoMid), NOW)).toEqual({ facts: repoMid, ok: true, brief: false });
  });

  it('turns a failed read into no facts and ok: false', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await readBadgeFacts(Promise.reject(new Error('down')))).toEqual({ facts: null, ok: false, brief: true });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('card facts', () => {
  it('maps a developer with list sizes and no tier tables, and promotes as the full facts do', () => {
    const user = toUserCardFacts({
      user: {
        login: userMid.login,
        avatarUrl: null,
        country: userMid.country,
        s: userMid.s,
        c: userMid.c,
        f: userMid.f,
        snapshots: userMid.snapshots,
        rankGlobal: ranks(userMid.rankGlobal?.s ?? null, userMid.rankGlobal?.c ?? null),
        rankCountry: ranks(userMid.rankCountry?.s ?? null, userMid.rankCountry?.c ?? null),
        tiersGlobal: { sUsers: 3_300_000, cUsers: 1_100_000, fUsers: 1_650_000 },
        tiersCountry: { sUsers: 61_000, cUsers: 20_333, fUsers: 30_500 },
      },
    });

    expect(user?.tiersGlobal).toEqual({
      users: { s: 3_300_000, c: 1_100_000, f: 1_650_000 },
      tiers: { s: [], c: [], f: [] },
    });
    expect(user && promotedBadges(user, NOW)).toEqual(promotedBadges(userMid, NOW));
    expect(user && badgeTiles(user, promotedBadges(user, NOW), NOW)[0].alt).toBe(
      'octo-dev on GitRanks: stars rank #41,204 · top 2%',
    );
  });

  it('maps a repository with whether it has a history, not its points', () => {
    const repo = toRepoCardFacts({
      repo: {
        nameWithOwner: repoBig.nameWithOwner,
        language: repoBig.language,
        stars: repoBig.stars,
        gainedThisMonth: repoBig.gainedThisMonth,
        monthStarts: repoBig.monthStarts,
        history: { complete: true, current: { date: '2026-10-20T00:00:00Z', stars: repoBig.stars } },
        rank: { s: 1_204, sM: 1_250, l: 112, lM: 118, language: 'TypeScript' },
        starsBest: { total: 1_284 },
        pulse: { lastMonth: '2026-09', countryCount: 23, last12: { activeContributors: 186, newContributors: 41 } },
      },
      repoRankTiers: { repos: 5_300_000 },
      repoLanguages: [{ language: 'TypeScript', repos: 412_000 }],
    });

    expect(repo?.history?.points).toEqual([]);
    expect(repo?.totals).toEqual({ repos: 5_300_000, languageRepos: 412_000 });
    expect(repo && promotedBadges(repo, NOW).map(({ id }) => id)).toEqual([
      'rank',
      'contributors',
      'starred-by-card',
      'star-history',
    ]);
    expect(toRepoCardFacts({ repo: null, repoRankTiers: null, repoLanguages: [] })).toBeNull();
  });

  it('maps an organization with the months of its series alone', () => {
    const org = toOrgCardFacts(
      {
        orgRankTotal: 336_901,
        organization: {
          login: orgBig.login,
          avatarUrl: null,
          s: orgBig.s,
          reposCount: orgBig.reposCount,
          rankOrg: orgBig.rank,
          topRepos: orgBig.topRepos.slice(0, 1).map(({ nameWithOwner, stars, rank }) => ({
            nameWithOwner,
            stars,
            rank: { s: rank },
          })),
          pulse: {
            lastMonth: '2026-09',
            countryCount: 61,
            last12: { activeContributors: 2_104, newContributors: 318 },
          },
          pulseSeries: { months: ['2026-08', '2026-09'] },
        },
      },
      orgBig.login,
    );

    expect(org?.pulseSeries).toEqual({
      months: ['2026-08', '2026-09'],
      activeLinked: [],
      activeAnonymous: [],
      newContributors: [],
    });
    expect(org && promotedBadges(org, NOW)).toEqual(promotedBadges(orgBig, NOW));
    expect(toUserCardFacts({ user: null })).toBeNull();
  });

  it('keeps the big developer set without the full facts', () => {
    expect(promotedBadges(userBig, NOW).map(({ id }) => id)).toEqual(['rank', 'rank', 'profile-card', 'count-chart']);
  });
});
