import { describe, expect, it } from 'vitest';

import { findBadge } from './catalogue';
import { BadgeParamsError, defaultParams, LABEL_MAX_LENGTH, resolveParams } from './params';

const badge = (entity: 'user' | 'org' | 'repo', id: string) => {
  const found = findBadge(entity, id);
  if (!found) throw new Error(`no ${entity} ${id}`);
  return found;
};

const resolve = (entity: 'user' | 'org' | 'repo', id: string, query: string) =>
  resolveParams(badge(entity, id), new URLSearchParams(query));

describe('resolveParams', () => {
  it('starts shields on Night with the logo and their default extra', () => {
    expect(resolve('repo', 'rank', '')).toMatchObject({
      scheme: 'custom',
      preset: 'night',
      logo: true,
      extra: 'top',
      colors: null,
      theme: null,
      label: null,
    });
  });

  it('starts cards and charts on Auto', () => {
    expect(resolve('repo', 'rank-card', '')).toMatchObject({ scheme: 'auto', logo: true });
    expect(resolve('org', 'contributors-chart', '').scheme).toBe('auto');
  });

  it('ignores unknown keys, such as a cache-buster', () => {
    expect(resolve('repo', 'rank', 'v=2&utm_source=readme&foo')).toEqual(defaultParams(badge('repo', 'rank')));
  });

  it.each([
    'scheme=neon',
    'preset=pink',
    'logo=no',
    'theme=sepia',
    'left=red&right=blue',
    'left=%23fff',
    'right=%23000000',
    'rows=6',
    'by=forks',
    'scope=city',
    'size=huge',
    'order=random',
    'tiers=2',
    'value=everyone',
    'extra=Top',
    'language=',
  ])('refuses %s', (query) => {
    expect(() => resolve('repo', 'contributors-wall', query)).toThrow(BadgeParamsError);
  });

  it('takes both picked colours, in either length', () => {
    expect(resolve('repo', 'rank', 'left=%23fff&right=%230f766e').colors).toEqual({ left: '#fff', right: '#0f766e' });
  });

  it('keeps a long label to 40 characters, trimmed', () => {
    const label = `  ${'a'.repeat(60)}  `;
    const params = resolve('repo', 'rank', `label=${encodeURIComponent(label)}`);
    expect(params.label).toBe('a'.repeat(LABEL_MAX_LENGTH));
    expect(resolve('repo', 'rank', 'label=%20%20').label).toBeNull();
    expect(resolve('repo', 'rank', 'label=Rust%20rank').label).toBe('Rust rank');
  });

  it('cuts a label by characters, not by code units', () => {
    const label = '★'.repeat(30) + '🦀'.repeat(20);
    expect([...(resolve('repo', 'rank', `label=${encodeURIComponent(label)}`).label ?? '')]).toHaveLength(40);
  });

  it('turns the logo off with logo=0', () => {
    expect(resolve('repo', 'rank', 'logo=0').logo).toBe(false);
    expect(resolve('repo', 'rank-card', 'logo=0').logo).toBe(false);
  });

  it('takes "none" and each allowed extra, and refuses the rest', () => {
    expect(resolve('repo', 'rank', 'extra=none').extra).toBeNull();
    expect(resolve('repo', 'rank', 'extra=goal').extra).toBe('goal');
    expect(() => resolve('repo', 'rank', 'extra=of')).toThrow(/does not take "of"/);
    expect(() => resolve('repo', 'tier', 'extra=top')).toThrow(BadgeParamsError);
    expect(resolve('repo', 'tier', 'extra=level').extra).toBe('level');
  });

  it('refuses Legends for organizations, as value or extra', () => {
    expect(resolve('repo', 'contributors', 'value=legends&extra=legends')).toMatchObject({
      value: 'legends',
      extra: 'legends',
    });
    expect(() => resolve('org', 'contributors', 'value=legends')).toThrow(BadgeParamsError);
    expect(() => resolve('org', 'contributors', 'extra=legends')).toThrow(BadgeParamsError);
  });

  it('keeps Custom to shields', () => {
    expect(() => resolve('repo', 'rank-card', 'scheme=custom')).toThrow(/for shields/);
    expect(resolve('repo', 'rank-card', 'scheme=tint').scheme).toBe('tint');
  });

  it('gives a developer wall no "newest" order', () => {
    expect(() => resolve('user', 'contributors-wall', 'order=newest')).toThrow(BadgeParamsError);
    expect(resolve('org', 'contributors-wall', 'order=newest&rows=5&tiers=0')).toMatchObject({
      order: 'newest',
      rows: 5,
      tiers: false,
    });
  });

  it('reads only the options a badge takes', () => {
    expect(resolve('repo', 'rank', 'by=followers&scope=country&rows=1')).toMatchObject({
      by: 'stars',
      scope: 'global',
      rows: 3,
    });
    expect(resolve('user', 'rank', 'by=followers&scope=country')).toMatchObject({ by: 'followers', scope: 'country' });
    expect(resolve('user', 'language-rank', 'language=Rust').language).toBe('Rust');
    expect(resolve('repo', 'rank-card', 'size=social').size).toBe('social');
    expect(resolve('repo', 'star-history', 'size=social').size).toBeNull();
  });
});
