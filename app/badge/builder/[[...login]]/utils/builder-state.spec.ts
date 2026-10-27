import { describe, expect, it } from 'vitest';

import {
  builderHref,
  cleanStyle,
  isEntityName,
  parseBuilderQuery,
  parseSearch,
  stepOf,
  styleQuery,
} from './builder-state';
import { findBadge } from '@/badge/v3/catalogue';
import { mapV2BuilderQuery } from '@/badge/v3/v2-mapping';

const state = (query: string) => parseBuilderQuery(new URLSearchParams(query));
const step = (query: string) => stepOf(state(query));
const badge = (kind: 'user' | 'org' | 'repo', id: string) => findBadge(kind, id)!;

describe('deep links', () => {
  it.each([
    ['', 'find', null, null],
    ['repo=', 'find', 'repo', null],
    ['user=', 'find', 'user', null],
    ['org=%20', 'find', 'org', null],
    ['repo=acme/fastqueue', 'badge', 'repo', 'acme/fastqueue'],
    ['user=torvalds', 'badge', 'user', 'torvalds'],
    ['org=vercel&badge=rank', 'style', 'org', 'vercel'],
    ['user=torvalds&badge=rank&extra=top&scheme=night&step=embed', 'embed', 'user', 'torvalds'],
    ['user=torvalds&step=embed', 'badge', 'user', 'torvalds'],
    ['repo=&badge=rank&step=embed', 'find', 'repo', null],
  ])('?%s opens step %s', (query, expected, kind, name) => {
    expect(step(query)).toBe(expected);
    expect(state(query)).toMatchObject({ kind, name });
  });

  it('takes the first entity key only', () => {
    expect(state('user=a&repo=b/c')).toMatchObject({ kind: 'user', name: 'a' });
  });

  it('ignores a badge the kind does not have', () => {
    expect(step('org=vercel&badge=star-history')).toBe('badge');
    expect(step('repo=a/b&badge=star-history')).toBe('style');
  });

  it('reads the style and leaves the rest of the query alone', () => {
    expect(state('user=x&badge=rank&by=followers&scope=country&label=my%20rank&v=2&theme=dark').style).toEqual({
      by: 'followers',
      scope: 'country',
      label: 'my rank',
    });
  });

  it('opens every old builder link at a valid style step', () => {
    for (const query of [
      'type=position',
      'type=percentile&meta=monthly-change',
      'type=score&ranking=c',
      'type=tier&ranking=f&context=country',
      'meta=goal-next-tier&labelBgColor=%23123456',
    ]) {
      const mapped = state(mapV2BuilderQuery(new URLSearchParams(query), 'torvalds').toString());
      expect(stepOf(mapped)).toBe('style');
      expect(cleanStyle(mapped.badge!, mapped.style)).toEqual(
        Object.fromEntries(
          Object.entries(mapped.style).filter(([key, value]) => !(key === 'extra' && value === 'top')),
        ),
      );
    }
  });
});

describe('names', () => {
  it.each([
    ['repo', 'acme/fastqueue', true],
    ['repo', 'acme', false],
    ['repo', 'acme/fast/queue', false],
    ['user', 'torvalds', true],
    ['user', 'tor valds', false],
    ['org', 'acme/fastqueue', false],
  ] as const)('%s %s is a name: %s', (kind, name, expected) => {
    expect(isEntityName(kind, name)).toBe(expected);
  });

  it.each([
    ['torvalds', { kind: 'login', name: 'torvalds' }],
    [' @torvalds ', { kind: 'login', name: 'torvalds' }],
    ['facebook/react', { kind: 'repo', name: 'facebook/react' }],
    ['facebook / react', { kind: 'repo', name: 'facebook/react' }],
    ['https://github.com/facebook/react/issues/1?x=1', { kind: 'repo', name: 'facebook/react' }],
    ['github.com/torvalds', { kind: 'login', name: 'torvalds' }],
    ['', null],
    ['-bad-', null],
  ] as const)('a search for "%s" names %o', (input, expected) => {
    expect(parseSearch(input)).toEqual(expected);
  });
});

describe('cleanStyle', () => {
  it('drops defaults and keys the badge does not read', () => {
    expect(
      cleanStyle(badge('repo', 'rank'), {
        scheme: 'auto',
        logo: '1',
        extra: 'top',
        by: 'followers',
        rows: '2',
        label: '  ',
      }),
    ).toEqual({});
    expect(cleanStyle(badge('repo', 'rank-card'), { extra: 'top', label: 'x', scheme: 'night', logo: '0' })).toEqual({
      scheme: 'night',
      logo: '0',
    });
  });

  it('keeps picked colours only with Custom, both of them', () => {
    const rank = badge('user', 'rank');
    expect(cleanStyle(rank, { scheme: 'custom', left: '#111', right: '#222222' })).toEqual({
      scheme: 'custom',
      left: '#111',
      right: '#222222',
    });
    expect(cleanStyle(rank, { scheme: 'custom', left: '#111' })).toEqual({});
    expect(cleanStyle(rank, { scheme: 'night', left: '#111', right: '#222' })).toEqual({ scheme: 'night' });
  });

  it('drops a value the badge refuses instead of drawing a 400', () => {
    expect(cleanStyle(badge('repo', 'rank'), { extra: 'of', scheme: 'tier' })).toEqual({});
    expect(cleanStyle(badge('repo', 'tier'), { scheme: 'tier', extra: 'level' })).toEqual({
      extra: 'level',
      scheme: 'tier',
    });
    expect(cleanStyle(badge('repo', 'rank-card'), { scheme: 'custom', left: '#111', right: '#222' })).toEqual({});
    expect(cleanStyle(badge('user', 'contributors-wall'), { order: 'newest' })).toEqual({});
  });

  it('never repeats a contributors value as its extra', () => {
    expect(cleanStyle(badge('repo', 'contributors'), { value: 'countries', extra: 'countries' })).toEqual({
      value: 'countries',
    });
    expect(cleanStyle(badge('repo', 'contributors'), { value: 'new', extra: '5yr' })).toEqual({
      value: 'new',
      extra: '5yr',
    });
  });

  it('writes the query in a fixed order', () => {
    const query = styleQuery(badge('user', 'rank'), {
      logo: '0',
      label: 'Rank',
      scheme: 'violet',
      extra: 'month',
      scope: 'country',
      by: 'followers',
    });
    expect(query.toString()).toBe('by=followers&scope=country&extra=month&scheme=violet&label=Rank&logo=0');
  });
});

describe('builderHref', () => {
  it('writes each step', () => {
    expect(builderHref({ kind: null })).toBe('/badge/builder');
    expect(builderHref({ kind: 'repo' })).toBe('/badge/builder?repo=');
    expect(builderHref({ kind: 'repo', name: 'acme/fastqueue' })).toBe('/badge/builder?repo=acme/fastqueue');
    expect(
      builderHref({ kind: 'repo', name: 'acme/fastqueue', badge: badge('repo', 'rank'), style: { extra: 'month' } }),
    ).toBe('/badge/builder?repo=acme/fastqueue&badge=rank&extra=month');
    expect(
      builderHref({
        kind: 'user',
        name: 'octo-dev',
        badge: badge('user', 'rank'),
        style: { label: 'my (best) rank & more', scheme: 'night' },
        embed: true,
      }),
    ).toBe('/badge/builder?user=octo-dev&badge=rank&scheme=night&label=my%20(best)%20rank%20%26%20more&step=embed');
  });

  it('round-trips through the parser', () => {
    const href = builderHref({
      kind: 'org',
      name: 'nebula',
      badge: badge('org', 'contributors-wall'),
      style: { order: 'newest', rows: '2', tiers: '0', scheme: 'violet', logo: '0' },
      embed: true,
    });
    const parsed = state(href.split('?')[1]);
    expect(parsed).toMatchObject({ kind: 'org', name: 'nebula', embed: true });
    expect(parsed.badge?.id).toBe('contributors-wall');
    expect(parsed.style).toEqual({ order: 'newest', rows: '2', tiers: '0', scheme: 'violet', logo: '0' });
  });
});
