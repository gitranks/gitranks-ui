import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExampleCards, type ExampleRank } from './example-cards';

const example = (login: string, overrides: Partial<ExampleRank> = {}): ExampleRank => ({
  login,
  avatarUrl: null,
  location: null,
  flag: null,
  ranking: 's',
  rankings: {
    s: { position: 3, previous: 3, value: 156_000, rankedCount: 1_657_241, tier: { tier: 7, level: 5 } },
  },
  ...overrides,
});

describe('ExampleCards', () => {
  it('opens on the first example, with its place among them and a dot for each', () => {
    const html = renderToStaticMarkup(<ExampleCards examples={[example('cy-labs'), example('octocat')]} />);

    expect(html).toContain('aria-label="Example rank card"');
    expect(html).toMatch(/1(<!-- -->)? of (<!-- -->)?2/);
    expect(html).toContain('href="/profile/cy-labs"');
    expect(html).not.toContain('href="/profile/octocat"');
    expect(html).toContain('aria-pressed="true" aria-label="Show cy-labs"');
    expect(html).toContain('aria-pressed="false" aria-label="Show octocat"');
  });

  it("names the example's ranking and shows its facts: position, ranked count, percentile and total", () => {
    const html = renderToStaticMarkup(<ExampleCards examples={[example('cy-labs')]} />);

    expect(html).toContain('Stars rank');
    expect(html).toMatch(/#(<!-- -->)?3</);
    expect(html).toMatch(/of (<!-- -->)?1,657,241/);
    expect(html).toMatch(/Top (<!-- -->)?[\d.]+(<!-- -->)?%/);
    expect(html).toMatch(/156,000(<!-- -->)? (<!-- -->)?stars/);
  });

  it("uses the ranking's own title and unit", () => {
    const html = renderToStaticMarkup(
      <ExampleCards
        examples={[
          example('cy-labs', {
            ranking: 'c',
            rankings: { c: { position: 12, previous: 15, value: 4_200, rankedCount: 1_101_747, tier: null } },
          }),
        ]}
      />,
    );

    expect(html).toContain('Contributor rank');
    expect(html).toMatch(/4,200(<!-- -->)? (<!-- -->)?contribution stars/);
  });

  it('shows the name over the login, and the location with its flag when there is one', () => {
    const html = renderToStaticMarkup(
      <ExampleCards examples={[example('cy-labs', { name: 'Cy Labs', location: 'Lviv, Ukraine', flag: '🇺🇦' })]} />,
    );

    expect(html).toContain('>Cy Labs<');
    expect(html).toContain('>cy-labs<');
    expect(html).toContain('Lviv, Ukraine');
  });

  it('renders nothing without an example, or without the entry of the ranking it names', () => {
    expect(renderToStaticMarkup(<ExampleCards examples={[]} />)).toBe('');
    expect(renderToStaticMarkup(<ExampleCards examples={[example('cy-labs', { ranking: 'f' })]} />)).toBe('');
  });
});
