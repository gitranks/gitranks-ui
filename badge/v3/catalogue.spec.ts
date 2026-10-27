import { describe, expect, it } from 'vitest';

import { type Availability, availabilityOf, availableBadges, badgesOf, CATALOGUE, findBadge } from './catalogue';
import { contributorSegment } from './contributors';
import type { EntityFacts } from './facts';
import {
  NOW,
  orgBig,
  orgBigLater,
  orgMid,
  orgSmall,
  orgUnranked,
  repoBig,
  repoBigLater,
  repoMid,
  repoMidLater,
  repoSmall,
  repoUnranked,
  userBig,
  userBigLater,
  userMid,
  userSmall,
  userUnranked,
} from './fixtures';
import { resolveParams } from './params';
import { promotedBadges, promotionSetOf } from './promotion';
import { notYetShield, shieldContent } from './shields';
import type { EntityKind, Segment, ShieldContent } from './types';

const badge = (entity: EntityKind, id: string) => {
  const found = findBadge(entity, id);
  if (!found) throw new Error(`no ${entity} ${id}`);
  return found;
};

const params = (entity: EntityKind, id: string, query = '') =>
  resolveParams(badge(entity, id), new URLSearchParams(query));

const availability = (entity: EntityFacts, id: string, query = ''): Availability =>
  availabilityOf(entity, id, params(entity.kind, id, query), NOW);

const textOf = (segment: Segment | undefined) => segment?.runs.map(({ text }) => text).join('') ?? null;

const shield = (entity: EntityFacts, id: string, query = '') => {
  const content = shieldContent(entity, badge(entity.kind, id), params(entity.kind, id, query), NOW);
  return content ? { label: content.label, value: textOf(content.value), extra: textOf(content.extra) } : null;
};

describe('the catalogue', () => {
  it('has unique ids per entity', () => {
    for (const kind of ['user', 'org', 'repo'] as const) {
      const ids = badgesOf(kind).map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it.each(CATALOGUE.filter(({ format }) => format === 'shield').map((b) => [`${b.entity} ${b.id}`, b] as const))(
    '%s: its default extra is one it allows',
    (_, definition) => {
      if (definition.defaultExtra !== null) {
        expect(definition.extras).toContain(definition.defaultExtra);
      }
      expect(params(definition.entity, definition.id).extra).toBe(definition.defaultExtra);
      for (const extra of definition.extras) {
        // A contributors shield refuses its value as its extra (the default value is 12mo).
        if (definition.values && extra === '12mo') continue;
        expect(params(definition.entity, definition.id, `extra=${extra}`).extra).toBe(extra);
      }
    },
  );

  it.each([
    ['repo', 'rank', ['top', 'month', 'goal'], 'top'],
    ['repo', 'language-rank', ['of', 'top', 'month'], 'of'],
    ['repo', 'goal', ['togo'], 'togo'],
    ['repo', 'stars', ['month', 'race'], 'month'],
    ['repo', 'month', ['race'], 'race'],
    ['repo', 'starred-by', ['count'], 'count'],
    ['repo', 'sibling', ['shared'], null],
    ['repo', 'tier', ['level'], null],
    ['user', 'rank', ['top', 'month', 'goal'], 'top'],
    ['user', 'language-rank', ['of', 'top', 'month'], 'of'],
    ['user', 'goal', ['togo'], 'togo'],
    ['user', 'month', ['race'], 'race'],
    ['user', 'climb', ['race', 'rank'], null],
    ['user', 'tier', ['level'], null],
    ['org', 'rank', ['top', 'month'], 'top'],
    ['org', 'stars', ['repos'], 'repos'],
    ['org', 'top-repo', ['rank', 'stars'], 'rank'],
    ['org', 'popular-repos', [], null],
  ] as const)('%s %s allows %o, %s by default', (entity, id, extras, defaultExtra) => {
    expect(badge(entity, id).extras).toEqual(extras);
    expect(badge(entity, id).defaultExtra).toBe(defaultExtra);
  });

  it('gives the contributors shields every contributor key, Legends for repositories only', () => {
    expect(badge('repo', 'contributors').values).toEqual(['12mo', 'month', 'new', '5yr', 'countries', 'legends']);
    expect(badge('org', 'contributors').values).toEqual(['12mo', 'month', 'new', '5yr', 'countries']);
    expect(badge('org', 'contributors').extras).not.toContain('legends');
  });
});

/** Every badge id, by fixture, as the builder sees it with its default options. */
const AVAILABLE: [string, EntityFacts, string[]][] = [
  [
    'repo 5–100',
    repoSmall,
    ['rank', 'language-rank', 'stars', 'month', 'tier', 'rank-card', 'tier-card', 'star-history'],
  ],
  [
    'repo 100–1k',
    repoMid,
    ['rank', 'language-rank', 'stars', 'month', 'tier', 'rank-card', 'tier-card', 'star-history'],
  ],
  [
    'repo 100–1k, later',
    repoMidLater,
    ['rank', 'language-rank', 'goal', 'stars', 'month', 'tier', 'rank-card', 'tier-card', 'star-history'],
  ],
  [
    'repo 1k+',
    repoBig,
    [
      'rank',
      'language-rank',
      'stars',
      'month',
      'starred-by',
      'contributors',
      'sibling',
      'tier',
      'rank-card',
      'stars-card',
      'starred-by-card',
      'community-card',
      'tier-card',
      'star-history',
      'contributors-chart',
    ],
  ],
  [
    'repo 1k+, later',
    repoBigLater,
    [
      'rank',
      'language-rank',
      'goal',
      'stars',
      'month',
      'starred-by',
      'contributors',
      'sibling',
      'tier',
      'rank-card',
      'stars-card',
      'starred-by-card',
      'community-card',
      'tier-card',
      'star-history',
      'contributors-chart',
      'contributors-wall',
    ],
  ],
  ['repo unranked', repoUnranked, ['star-history']],
  ['user under 100', userSmall, ['rank', 'language-rank', 'month', 'climb', 'tier', 'profile-card', 'count-chart']],
  ['user 100–1k', userMid, ['rank', 'language-rank', 'month', 'climb', 'tier', 'profile-card', 'count-chart']],
  ['user 1k+', userBig, ['rank', 'language-rank', 'month', 'climb', 'tier', 'profile-card', 'count-chart']],
  [
    'user 1k+, later',
    userBigLater,
    ['rank', 'language-rank', 'goal', 'month', 'climb', 'tier', 'profile-card', 'count-chart'],
  ],
  ['user unranked', userUnranked, []],
  ['org under 1k', orgSmall, ['rank', 'stars', 'top-repo', 'org-card']],
  ['org 1k–10k', orgMid, ['rank', 'stars', 'top-repo', 'org-card']],
  ['org 10k+', orgBig, ['rank', 'stars', 'top-repo', 'contributors', 'org-card', 'contributors-chart']],
  [
    'org 10k+, later',
    orgBigLater,
    [
      'rank',
      'stars',
      'top-repo',
      'popular-repos',
      'contributors',
      'org-card',
      'contributors-chart',
      'contributors-wall',
    ],
  ],
  ['org unranked', orgUnranked, []],
];

describe('availability', () => {
  it.each(AVAILABLE)('%s offers its badges', (_, entity, ids) => {
    const offered = availableBadges(entity, params(entity.kind, 'rank'), NOW).map(({ id }) => id);
    expect(offered.toSorted()).toEqual(ids.toSorted());
  });

  it('reads the developer options: ranking and scope', () => {
    // 2 own stars: under the ranking's 5, so ranked by contributions and followers only.
    const contributor = { ...userSmall, s: 2 };
    expect(availability(contributor, 'rank')).toBe('never');
    expect(availability(contributor, 'tier')).toBe('never');
    expect(availability(contributor, 'rank', 'by=contributions')).toBe('available');
    expect(availability(contributor, 'rank', 'by=contributions&scope=country')).toBe('available');
    expect(availability({ ...contributor, country: null }, 'rank', 'by=contributions&scope=country')).toBe('never');
    expect(availability(contributor, 'tier', 'by=followers')).toBe('available');
    expect(availability(contributor, 'profile-card')).toBe('available');
  });

  it('offers a language rank only for a language the entity is ranked in', () => {
    expect(availability(repoMid, 'language-rank', 'language=rust')).toBe('available');
    expect(availability(repoMid, 'language-rank', 'language=Go')).toBe('never');
    expect(availability(userMid, 'language-rank', 'language=TypeScript')).toBe('available');
    expect(availability(userMid, 'language-rank', 'language=Zig')).toBe('never');
  });

  it('needs three people for a contributors shield or wall', () => {
    expect(availability({ ...repoBig, pulse: { ...repoBig.pulse!, active12: 2 } }, 'contributors')).toBe('neutral');
    expect(availability(repoBigLater, 'contributors-wall', 'order=contributions')).toBe('available');
    expect(availability(repoBigLater, 'contributors-wall', 'order=newest')).toBe('never');
  });

  describe('volatile badges never fall back to "not yet"', () => {
    it.each<[string, EntityFacts, string, string, string]>([
      ['month on the 1st', { ...repoMid, gainedThisMonth: 0 }, 'month', 'this month', '+0 ★'],
      ['goal with no goal left', repoMid, 'goal', 'repo rank', '#41,206'],
      ['sibling gone', { ...repoBig, siblings: [] }, 'sibling', 'sibling repo', '–'],
      [
        'starred-by without a named stargazer',
        {
          ...repoBig,
          starsBest: { ...repoBig.starsBest!, top: [{ login: null, avatarUrl: null, tier: 7, level: 1 }] },
        },
        'starred-by',
        'starred by',
        '1,284 top devs',
      ],
      ['user month after a quiet month', { ...userMid, s: 602 }, 'month', 'this month', '+0 ★'],
      [
        'climb after a fall',
        { ...userMid, rankGlobal: { ...userMid.rankGlobal!, s: 42_000 } },
        'climb',
        'this month',
        '–',
      ],
      ['user goal with no goal left', userMid, 'goal', 'stars rank', '#41,204'],
      ['org top repo gone', { ...orgMid, topRepos: [] }, 'top-repo', 'top repo', '–'],
    ])('%s', (_, entity, id, label, value) => {
      expect(availability(entity, id)).toBe('neutral');
      expect(shield(entity, id)).toEqual({ label, value, extra: null });
    });
  });

  it('says "not yet" only for a badge that never applied', () => {
    expect(availability(repoMid, 'contributors')).toBe('never');
    expect(shield(repoMid, 'contributors')).toBeNull();
    expect(availability(repoUnranked, 'rank')).toBe('never');
    expect(shield(repoUnranked, 'tier')).toBeNull();
    expect(availability(userUnranked, 'climb')).toBe('never');
    expect(notYetShield(badge('repo', 'contributors'), params('repo', 'contributors'))).toEqual({
      label: 'contributors',
      value: { runs: [{ text: 'not yet' }] },
    });
    expect(notYetShield(badge('user', 'rank'), params('user', 'rank', 'by=followers&label=Mine')).label).toBe('Mine');
  });

  it('keeps the developer wall hidden, even with a wall to draw', () => {
    expect(userBigLater.contributorsWall?.popular?.entries.length).toBeGreaterThan(3);
    for (const order of ['popular', 'contributions']) {
      expect(availability(userBigLater, 'contributors-wall', `order=${order}`)).toBe('never');
    }
    expect(promotedBadges(userBigLater, NOW).map(({ id }) => id)).not.toContain('contributors-wall');
  });

  it('needs three monthly points of the asked ranking for a count chart', () => {
    const starsOnly = {
      ...userMid,
      snapshots: Object.fromEntries(Object.entries(userMid.snapshots ?? {}).map(([key, { s }]) => [key, { s }])),
    };
    expect(availability(starsOnly, 'count-chart')).toBe('available');
    expect(availability(starsOnly, 'count-chart', 'by=followers')).toBe('never');
    expect(availability(userMid, 'count-chart', 'by=followers')).toBe('available');
  });

  it('draws star history for any repository it holds', () => {
    expect(availability(repoUnranked, 'star-history')).toBe('available');
  });
});

/** Words a value never starts with: no sentence is split across label and value. */
const MID_SENTENCE = /^(to|of|in|and|the|than|for|by|at|with)\b/i;

describe('shield text', () => {
  const cases: [string, EntityFacts, string, string, ShieldText][] = [
    ['repo rank', repoMid, 'rank', '', { label: 'repo rank', value: '#41,206', extra: 'top 1%' }],
    ['repo rank, month', repoMid, 'rank', 'extra=month', { label: 'repo rank', value: '#41,206', extra: '↑312' }],
    [
      'repo rank, goal',
      repoMidLater,
      'rank',
      'extra=goal',
      { label: 'repo rank', value: '#41,206', extra: '8 ★ to top 25 Rust repos' },
    ],
    ['repo language rank', repoMid, 'language-rank', '', { label: 'Rust rank', value: '#38', extra: 'of 9,120' }],
    ['repo goal', repoMidLater, 'goal', '', { label: 'next goal', value: 'top 25 Rust repos', extra: '8 ★ to go' }],
    ['repo stars', repoMid, 'stars', '', { label: 'stars', value: '812', extra: '+38 this month' }],
    ['repo stars, race', repoMid, 'stars', 'extra=race', { label: 'stars', value: '812', extra: '11 to beat Sep' }],
    ['repo month', repoMid, 'month', '', { label: 'this month', value: '+38 ★', extra: '11 to beat Sep' }],
    [
      'repo month beaten',
      { ...repoMid, gainedThisMonth: 52 },
      'month',
      '',
      { label: 'this month', value: '+52 ★', extra: 'beat Sep ↑' },
    ],
    ['repo month, no extra', repoMid, 'month', 'extra=none', { label: 'this month', value: '+38 ★', extra: null }],
    ['repo starred by', repoBig, 'starred-by', '', { label: 'starred by', value: 'dev-0', extra: '+1,283 top devs' }],
    [
      'repo contributors',
      repoBig,
      'contributors',
      'extra=new',
      { label: 'contributors', value: '186 in 12 mo', extra: '+27 new in Sep' },
    ],
    [
      'repo contributors, later',
      repoBigLater,
      'contributors',
      '',
      { label: 'contributors', value: '186 in 12 mo', extra: '23 countries' },
    ],
    [
      'repo contributors, Legends',
      repoBigLater,
      'contributors',
      'value=legends&extra=5yr',
      { label: 'contributors', value: '3 Legends', extra: '2,410 in 5 yrs' },
    ],
    [
      'repo contributors, last month',
      repoBig,
      'contributors',
      'value=month&extra=none',
      { label: 'contributors', value: '192 in Sep', extra: null },
    ],
    [
      'repo sibling',
      repoBig,
      'sibling',
      'extra=shared',
      { label: 'sibling repo', value: 'vercel/next.js', extra: '33% shared' },
    ],
    ['repo tier', repoMid, 'tier', '', { label: 'gitranks', value: 'Planet', extra: null }],
    ['repo tier, level', repoMid, 'tier', 'extra=level', { label: 'gitranks', value: 'Planet', extra: 'level 3 of 5' }],
    ['user rank', userBig, 'rank', '', { label: 'stars rank', value: '#13', extra: 'top 0.001%' }],
    [
      'user country rank',
      userBig,
      'rank',
      'scope=country&extra=none',
      { label: 'stars rank', value: '#2 in Ukraine', extra: null },
    ],
    [
      'user contributions rank',
      userSmall,
      'rank',
      'by=contributions',
      { label: 'contrib rank', value: '#8,210', extra: 'top 1%' },
    ],
    [
      'user followers rank, month',
      userBig,
      'rank',
      'by=followers&extra=month',
      { label: 'followers rank', value: '#40', extra: null },
    ],
    ['user language rank', userMid, 'language-rank', '', { label: 'Rust rank', value: '#14,002', extra: 'of 610,207' }],
    ['user goal', userBigLater, 'goal', '', { label: 'next goal', value: 'top 10 devs', extra: '5,210 ★ to go' }],
    ['user month', userMid, 'month', '', { label: 'this month', value: '+38 ★', extra: 'beat Sep ↑' }],
    [
      'user climb',
      userMid,
      'climb',
      'extra=race',
      { label: 'this month', value: '↑312 places', extra: '1,173 to beat Sep' },
    ],
    [
      'user climb, rank',
      userMid,
      'climb',
      'extra=rank',
      { label: 'this month', value: '↑312 places', extra: '#41,204 now' },
    ],
    ['user tier', userBig, 'tier', '', { label: 'gitranks', value: 'Legend', extra: null }],
    ['user tier, level', userBig, 'tier', 'extra=level', { label: 'gitranks', value: 'Legend', extra: 'level 5 of 5' }],
    ['org rank', orgBig, 'rank', '', { label: 'org rank', value: '#12', extra: null }],
    ['org rank, later', orgBigLater, 'rank', '', { label: 'org rank', value: '#12', extra: 'top 0.01%' }],
    ['org stars', orgBig, 'stars', '', { label: 'stars', value: '312k', extra: '418 repos' }],
    ['org top repo', orgMid, 'top-repo', '', { label: 'top repo', value: 'nebula/ui', extra: '#21,204' }],
    [
      'org top repo, stars',
      orgMid,
      'top-repo',
      'extra=stars',
      { label: 'top repo', value: 'nebula/ui', extra: '3.1k ★' },
    ],
    ['org 1k+ repos', orgBigLater, 'popular-repos', '', { label: '1k+ ★ repos', value: '14', extra: null }],
    [
      'org contributors',
      orgBigLater,
      'contributors',
      'value=new&extra=countries',
      { label: 'contributors', value: '+27 new in Sep', extra: '61 countries' },
    ],
    [
      'a custom label',
      repoMid,
      'rank',
      `label=${encodeURIComponent('  our place among all repos on GitHub today ')}`,
      { label: 'our place among all repos on GitHub toda', value: '#41,206', extra: 'top 1%' },
    ],
  ];

  it.each(cases)('%s', (_, entity, id, query, expected) => {
    const actual = shield(entity, id, query);
    expect(actual).toEqual(expected);
    expect(actual?.value).not.toMatch(MID_SENTENCE);
  });

  it('labels a badge in one or two words, a language rank naming its language', () => {
    for (const [, entity, id] of cases) {
      if (id === 'popular-repos') continue;
      const label = shield(entity, id)?.label ?? '';
      expect(label.split(' ').length).toBeLessThanOrEqual(2);
    }
    expect(shield(repoMid, 'language-rank')?.label).toBe('Rust rank');
  });

  it('leaves a default extra out silently when there is nothing to show', () => {
    expect(shield({ ...repoMid, gainedThisMonth: 0 }, 'stars')).toEqual({ label: 'stars', value: '812', extra: null });
    expect(shield(repoBig, 'contributors')).toEqual({ label: 'contributors', value: '186 in 12 mo', extra: null });
  });

  it('marks a record month in gold', () => {
    const history = {
      points: [
        { date: '2026-08-01T00:00:00Z', stars: 700 },
        { date: '2026-09-01T00:00:00Z', stars: 726 },
        { date: '2026-10-01T00:00:00Z', stars: 774 },
      ],
      current: { date: '2026-10-20T00:00:00Z', stars: 986 },
      complete: true,
    };
    const content = shieldContent(
      { ...repoMid, gainedThisMonth: 212, history },
      badge('repo', 'month'),
      params('repo', 'month'),
      NOW,
    ) as ShieldContent;
    expect(content.label).toBe('record month');
    expect(content.value.runs[0]).toEqual({ text: '+212 ★', mono: true, tone: 'gold' });
    expect(content.extra).toBeUndefined();
  });

  it('leads tiers with their glyph, in the tier colour', () => {
    const repoTier = shieldContent(repoMid, badge('repo', 'tier'), params('repo', 'tier'), NOW);
    expect(repoTier?.value).toMatchObject({ icon: { kind: 'repo-tier', tier: 4 }, tone: { tier: 4 } });
    const userTier = shieldContent(userBig, badge('user', 'tier'), params('user', 'tier'), NOW);
    expect(userTier?.value).toMatchObject({ icon: { kind: 'user-tier', tier: 7 }, tone: { tier: 7 } });
  });

  it('writes contributor values with their period', () => {
    expect(textOf(contributorSegment(repoBigLater, '12mo') ?? undefined)).toBe('186 in 12 mo');
    expect(textOf(contributorSegment(repoBigLater, 'month') ?? undefined)).toBe('192 in Sep');
    expect(textOf(contributorSegment(repoBigLater, 'new') ?? undefined)).toBe('+27 new in Sep');
    expect(textOf(contributorSegment(repoBigLater, '5yr') ?? undefined)).toBe('2,410 in 5 yrs');
    expect(textOf(contributorSegment(repoBigLater, 'countries') ?? undefined)).toBe('23 countries');
    expect(textOf(contributorSegment(repoBigLater, 'legends') ?? undefined)).toBe('3 Legends');
    expect(contributorSegment(orgBigLater, 'legends')).toBeNull();
    // No Built by: no Legends count at all, not zero.
    expect(contributorSegment({ ...repoBigLater, builtBy: null }, 'legends')).toBeNull();
    expect(textOf(contributorSegment({ ...repoBigLater, builtBy: [] }, 'legends') ?? undefined)).toBe('0 Legends');
    expect(contributorSegment(repoBig, 'countries')).toBeNull();
  });
});

type ShieldText = { label: string; value: string | null; extra: string | null };

describe('promotion', () => {
  it.each([
    [repoSmall, '5–100', ['language-rank', 'rank-card']],
    [repoMid, '100–1k', ['rank', 'language-rank', 'month', 'rank-card']],
    [repoMidLater, '100–1k', ['rank', 'language-rank', 'month', 'rank-card']],
    [{ ...repoMidLater, stars: 90 }, '5–100', ['language-rank', 'goal', 'rank-card']],
    [repoBig, '1k+', ['rank', 'contributors', 'starred-by-card', 'star-history']],
    [userSmall, 'under 100', ['rank', 'rank', 'month']],
    [userMid, '100–1k', ['rank', 'rank', 'month', 'profile-card']],
    [userBig, '1k+', ['rank', 'rank', 'profile-card', 'count-chart']],
    [orgSmall, 'under 1k', ['rank', 'stars']],
    [orgMid, '1k–10k', ['rank', 'top-repo', 'org-card']],
    [orgBig, '10k+', ['rank', 'contributors', 'org-card', 'contributors-chart']],
    [orgUnranked, 'under 1k', []],
  ] as const)('%#: the %s set, available badges only', (entity, bucket, ids) => {
    expect(promotionSetOf(entity).bucket).toBe(bucket);
    expect(promotedBadges(entity, NOW).map(({ id }) => id)).toEqual(ids);
  });

  it("promotes a small developer's contribution and country ranks", () => {
    expect(promotedBadges(userSmall, NOW).slice(0, 2)).toEqual([
      { id: 'rank', query: { by: 'contributions' } },
      { id: 'rank', query: { scope: 'country' } },
    ]);
  });
});
