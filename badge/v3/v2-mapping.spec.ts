import { describe, expect, it } from 'vitest';

import { findBadge } from './catalogue';
import { resolveParams } from './params';
import { isV2BuilderRequest, mapV2BuilderQuery } from './v2-mapping';
import { BadgeV2ZodSchema } from '@/badge/badge.zod';

const map = (query: string, login?: string) =>
  Object.fromEntries(mapV2BuilderQuery(new URLSearchParams(query), login).entries());

describe('isV2BuilderRequest', () => {
  it.each([
    'ranking=c',
    'type=tier',
    'meta=none',
    'context=country',
    'labelBgColor=%23000',
    'valueBgColor=%23fff',
    'cornerStyle=squared',
  ])('knows an old builder link by %s', (query) => {
    expect(isV2BuilderRequest(new URLSearchParams(query))).toBe(true);
  });

  it('knows an old builder link by a login in the path', () => {
    expect(isV2BuilderRequest(new URLSearchParams(), 'torvalds')).toBe(true);
  });

  it('never takes a v3 builder link for an old one', () => {
    const v3 = 'user=torvalds&badge=rank&extra=top&by=followers&scope=country&scheme=night&logo=1&label=x';
    expect(isV2BuilderRequest(new URLSearchParams(v3))).toBe(false);
  });
});

describe('mapV2BuilderQuery', () => {
  it('maps the default old badge to the plain rank in the old colours without the mark', () => {
    expect(map('', 'torvalds')).toEqual({
      user: 'torvalds',
      badge: 'rank',
      extra: 'none',
      scheme: 'classic',
      logo: '0',
    });
    expect(map('ranking=s').user).toBe('');
  });

  it.each([
    ['type=position', 'rank', 'none'],
    ['type=percentile', 'rank', 'top'],
    ['type=score', 'rank', 'none'],
    ['type=tier', 'tier', undefined],
  ])('lets %s decide the badge', (query, badge, extra) => {
    expect(map(query)).toMatchObject({ badge });
    expect(map(query).extra).toBe(extra);
  });

  it.each([
    ['meta=none', 'none'],
    ['meta=percentile', 'top'],
    ['meta=monthly-change', 'month'],
    ['meta=goal-next-tier', 'goal'],
    ['meta=goal-top-1', 'goal'],
    ['meta=goal-top-10', 'goal'],
    ['meta=goal-top-25', 'goal'],
  ])('maps %s on a rank to extra=%s', (query, extra) => {
    expect(map(`type=position&${query}`).extra).toBe(extra);
    expect(map(`type=score&${query}`).extra).toBe(extra);
  });

  it('lets type=percentile win over meta', () => {
    for (const meta of ['none', 'percentile', 'monthly-change', 'goal-next-tier', 'goal-top-10']) {
      expect(map(`type=percentile&meta=${meta}`).extra).toBe('top');
    }
  });

  it('drops every meta on a tier badge', () => {
    for (const meta of ['none', 'percentile', 'monthly-change', 'goal-next-tier', 'goal-top-25']) {
      expect(map(`type=tier&meta=${meta}`).extra).toBeUndefined();
    }
  });

  it('maps the ranking and the context', () => {
    expect(map('ranking=c')).toMatchObject({ by: 'contributions' });
    expect(map('ranking=f&context=country')).toMatchObject({ by: 'followers', scope: 'country' });
    expect(map('ranking=s&context=global').by).toBeUndefined();
    expect(map('ranking=s&context=global').scope).toBeUndefined();
  });

  it('carries picked colours, filling a missing one with the old default', () => {
    expect(map('labelBgColor=%23000&valueBgColor=%23fff')).toMatchObject({
      scheme: 'custom',
      left: '#000',
      right: '#fff',
    });
    expect(map('valueBgColor=%237c3aed')).toMatchObject({ left: '#5c5c5c', right: '#7c3aed' });
    expect(map('labelBgColor=%23123456')).toMatchObject({ left: '#123456', right: '#2282c2' });
    expect(map('valueBgColor=%237c3aed').scheme).toBe('custom');
  });

  it('keeps the label, cut to 40 characters, and drops the corner style', () => {
    expect(map(`label=${'x'.repeat(50)}&cornerStyle=squared`)).toMatchObject({ label: 'x'.repeat(40) });
    expect(map('cornerStyle=squared').cornerStyle).toBeUndefined();
  });
});

/** Every example the old gallery links to (`badge-example.tsx` builds the builder link from these props). */
const GALLERY_EXAMPLES = [
  { label: 'Stars Rank' },
  { label: 'Contributor Rank', ranking: 'c' },
  { label: 'Followers Rank', ranking: 'f' },
  { label: 'Total Stars', type: 'score', valueBgColor: '#1e3a8a' },
  { label: 'Contribution Score', ranking: 'c', type: 'score', valueBgColor: '#1e3a8a' },
  { label: 'Total Followers', ranking: 'f', type: 'score', valueBgColor: '#1e3a8a' },
  { label: 'Stars Rank', type: 'tier', valueBgColor: '#7c3aed' },
  { label: 'Contributor Rank', ranking: 'c', type: 'tier', valueBgColor: '#7c3aed' },
  { label: 'Followers Rank', ranking: 'f', type: 'tier', valueBgColor: '#7c3aed' },
  { label: 'Stars Rank', type: 'percentile', valueBgColor: '#7f5539' },
  { label: 'Contributor Rank', ranking: 'c', type: 'percentile', valueBgColor: '#7f5539' },
  { label: 'Followers Rank', ranking: 'f', type: 'percentile', valueBgColor: '#7f5539' },
  { label: 'USA Stars Rank', context: 'country' },
  { label: 'Ukraine Followers Rank', context: 'country', ranking: 'f', type: 'tier', valueBgColor: '#7c3aed' },
  { label: 'India Stars Rank', context: 'country', ranking: 's', type: 'percentile', valueBgColor: '#7f5539' },
  { label: 'Stars Rank', meta: 'monthly-change' },
  { label: 'Total Followers', ranking: 'f', meta: 'percentile', valueBgColor: '#1e3a8a' },
  { label: 'Stars Rank', ranking: 's', meta: 'goal-top-10' },
  { label: 'Stars Rank' },
  { label: 'Stars Rank', cornerStyle: 'squared' },
];

describe('the old gallery links', () => {
  it.each(GALLERY_EXAMPLES.map((example) => [JSON.stringify(example), example] as const))(
    '%s maps to a valid v3 state',
    (_, example) => {
      // The link as the gallery writes it: every parsed field, defaults included.
      const parsed = BadgeV2ZodSchema.parse(example);
      const query = new URLSearchParams(
        Object.entries(parsed).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])),
      );
      expect(isV2BuilderRequest(query)).toBe(true);

      const mapped = mapV2BuilderQuery(query, 'torvalds');
      const badge = findBadge('user', mapped.get('badge') ?? '');
      expect(badge).not.toBeNull();
      if (!badge) return;
      const { user, badge: _badge, ...rest } = Object.fromEntries(mapped.entries());
      expect(user).toBe('torvalds');
      expect(() => resolveParams(badge, rest)).not.toThrow();
      expect(resolveParams(badge, rest)).toMatchObject({
        scheme: 'valueBgColor' in example || 'labelBgColor' in example ? 'custom' : 'classic',
        logo: false,
        label: example.label,
      });
    },
  );

  it('maps f__country__tier to the followers tier in the country', () => {
    expect(map('ranking=f&context=country&type=tier&valueBgColor=%237c3aed')).toMatchObject({
      badge: 'tier',
      by: 'followers',
      scope: 'country',
    });
  });
});
