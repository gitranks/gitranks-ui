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
  it('starts shields on Auto with the logo and their default extra', () => {
    expect(resolve('repo', 'rank', '')).toMatchObject({
      scheme: 'auto',
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
    'scheme=tint',
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

  it('takes both picked colours with scheme=custom, in either length', () => {
    expect(resolve('repo', 'rank', 'scheme=custom&left=%23fff&right=%230f766e')).toMatchObject({
      scheme: 'custom',
      colors: { left: '#fff', right: '#0f766e' },
    });
    expect(() => resolve('repo', 'rank', 'left=%23fff&right=%230f766e')).toThrow(/scheme=custom/);
    expect(() => resolve('repo', 'rank', 'scheme=custom')).toThrow(/needs both/);
    expect(() => resolve('repo', 'rank', 'scheme=night&left=%23fff&right=%23000')).toThrow(BadgeParamsError);
  });

  it('keeps a long label to 40 characters, trimmed', () => {
    const label = `  ${'a'.repeat(60)}  `;
    const params = resolve('repo', 'rank', `label=${encodeURIComponent(label)}`);
    expect(params.label).toBe('a'.repeat(LABEL_MAX_LENGTH));
    expect(resolve('repo', 'rank', 'label=%20%20').label).toBeNull();
    expect(resolve('repo', 'rank', 'label=Rust%20rank').label).toBe('Rust rank');
  });

  it('takes a label of any length, cut before parsing', () => {
    expect(resolve('repo', 'rank', `label=${'x'.repeat(5_000)}`).label).toBe('x'.repeat(LABEL_MAX_LENGTH));
  });

  it('never repeats the value as the extra on a contributors shield', () => {
    expect(() => resolve('repo', 'contributors', 'value=12mo&extra=12mo')).toThrow(/already the value/);
    // The default extra is countries: asked for as the value, the default extra is left out.
    expect(resolve('repo', 'contributors', 'value=countries').extra).toBeNull();
    expect(resolve('repo', 'contributors', 'value=countries&extra=new').extra).toBe('new');
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
    expect(resolve('repo', 'contributors', 'value=legends&extra=12mo')).toMatchObject({
      value: 'legends',
      extra: '12mo',
    });
    expect(() => resolve('org', 'contributors', 'value=legends')).toThrow(BadgeParamsError);
    expect(() => resolve('org', 'contributors', 'extra=legends')).toThrow(BadgeParamsError);
  });

  it('offers shields every scheme, Tier only where the shield shows a tier', () => {
    for (const scheme of ['auto', 'night', 'violet', 'classic']) {
      expect(resolve('repo', 'rank', `scheme=${scheme}`).scheme).toBe(scheme);
    }
    expect(resolve('repo', 'tier', 'scheme=tier').scheme).toBe('tier');
    expect(resolve('user', 'tier', 'scheme=tier').scheme).toBe('tier');
    expect(() => resolve('repo', 'rank', 'scheme=tier')).toThrow(/does not take "tier"/);
    expect(() => resolve('org', 'stars', 'scheme=tier')).toThrow(BadgeParamsError);
  });

  it('offers cards and charts Auto, Night, Violet and Classic only', () => {
    for (const scheme of ['auto', 'night', 'violet', 'classic']) {
      expect(resolve('repo', 'rank-card', `scheme=${scheme}`).scheme).toBe(scheme);
      expect(resolve('user', 'count-chart', `scheme=${scheme}`).scheme).toBe(scheme);
    }
    expect(() => resolve('repo', 'rank-card', 'scheme=custom&left=%23000&right=%23fff')).toThrow(BadgeParamsError);
    expect(() => resolve('repo', 'tier-card', 'scheme=tier')).toThrow(BadgeParamsError);
  });

  it('ignores the old preset key', () => {
    expect(resolve('repo', 'rank', 'preset=violet').scheme).toBe('auto');
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
