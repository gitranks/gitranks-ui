import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { StarsBestSection } from './stars-best-section';

vi.mock('next/image', () => ({ default: (props: { alt: string }) => <img alt={props.alt} /> }));

const person = (login: string | null, tier: number, level: number) => ({
  login,
  avatarUrl: login ? `https://avatars.githubusercontent.com/${login}?v=4` : null,
  tier,
  level,
});

const full = {
  total: 1_284,
  counts: [
    { tier: 7, count: 214 },
    { tier: 6, count: 1_070 },
  ],
  top: [
    person('ana', 7, 5),
    person('bo', 7, 5),
    person(null, 7, 4),
    person('cy', 7, 4),
    person('di', 7, 3),
    person('ed', 6, 5),
    person('fay', 6, 5),
    person('gus', 6, 4),
  ],
  legendRatio: 4.23,
};

const compact = {
  total: 3,
  counts: [
    { tier: 7, count: 1 },
    { tier: 6, count: 2 },
  ],
  top: [person('ana', 7, 2), person('bo', 6, 5), person('cy', 6, 1)],
  legendRatio: null,
};

describe('StarsBestSection', () => {
  it('shows the full section from 20: the count, the tiers, the ratio and the six highest ranked', () => {
    const html = renderToStaticMarkup(<StarsBestSection starsBest={full} repoTier={7} />);

    expect(html).toContain('Starred by the best');
    expect(html).toContain('1,284');
    expect(html).toContain('top developers starred it');
    expect(html).toMatch(/214<\/b> (<!-- -->)?Legends/);
    expect(html).toMatch(/1,070<\/b> (<!-- -->)?Elites/);
    expect(html).toMatch(/Legends star it (<!-- -->)?4\.2×(<!-- -->)? more often/);
    expect(html).toMatch(/other (<!-- -->)?Supernova repositories/);
    expect(html).toContain('href="/profile/ana"');
    expect(html).toContain('Name not shown');
    expect(html).toContain('href="/profile/ed"');
    expect(html).not.toContain('/profile/fay');
    expect(html).toContain('whose own repositories have 1,000+ stars');
  });

  it('leaves the ratio out under 1.5', () => {
    const html = renderToStaticMarkup(<StarsBestSection starsBest={{ ...full, legendRatio: 1.4 }} repoTier={7} />);

    expect(html).not.toContain('more often');
  });

  it('shows one line under 20, naming the first and counting the rest', () => {
    const html = renderToStaticMarkup(<StarsBestSection starsBest={compact} repoTier={4} />);

    expect(html).toContain('Starred by the best');
    expect(html).not.toContain('top developers starred it');
    expect(html.replace(/<[^>]+>/g, '')).toContain('Starred by ana Legend 2 and 2 Elites.');
    expect(html).toContain('alt="ana, Legend 2"');
    expect(html).toContain('alt="bo, Elite 5"');
  });

  it('shows an avatar without a login unlinked', () => {
    const html = renderToStaticMarkup(
      <StarsBestSection
        starsBest={{ ...compact, total: 1, counts: [{ tier: 7, count: 1 }], top: [person(null, 7, 2)] }}
      />,
    );

    expect(html).not.toContain('href=');
    expect(html.replace(/<[^>]+>/g, '')).toContain('Starred by a Legend 2.');
  });

  it('names the first stargazer with a login, counting the rest of that tier as "more"', () => {
    const html = renderToStaticMarkup(
      <StarsBestSection
        starsBest={{
          total: 4,
          counts: [{ tier: 6, count: 4 }],
          top: [person(null, 6, 5), person('bo', 6, 3), person('cy', 6, 1)],
          legendRatio: null,
        }}
      />,
    );

    expect(html.replace(/<[^>]+>/g, '')).toContain('Starred by bo Elite 3 and 3 more Elites.');
  });

  it('takes "an" before an Elite without a login', () => {
    const html = renderToStaticMarkup(
      <StarsBestSection
        starsBest={{ total: 2, counts: [{ tier: 6, count: 2 }], top: [person(null, 6, 3)], legendRatio: null }}
      />,
    );

    expect(html.replace(/<[^>]+>/g, '')).toContain('Starred by an Elite 3 and 1 more Elite.');
  });

  it('says how many when neither names nor tiers came with the count', () => {
    const one = renderToStaticMarkup(
      <StarsBestSection starsBest={{ total: 1, counts: [], top: [], legendRatio: null }} />,
    );
    const five = renderToStaticMarkup(
      <StarsBestSection starsBest={{ total: 5, counts: [], top: [], legendRatio: null }} />,
    );

    expect(one.replace(/<[^>]+>/g, '')).toContain('Starred by 1 top developer.');
    expect(five.replace(/<[^>]+>/g, '')).toContain('Starred by 5 top developers.');
  });

  it('keeps one column without anyone to name in the full section', () => {
    const html = renderToStaticMarkup(<StarsBestSection starsBest={{ ...full, top: [] }} />);

    expect(html).not.toContain('grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]');
    expect(html).not.toContain('Highest ranked among them');
  });

  it('renders nothing without data or with nobody', () => {
    expect(renderToStaticMarkup(<StarsBestSection starsBest={null} />)).toBe('');
    expect(renderToStaticMarkup(<StarsBestSection starsBest={{ ...compact, total: 0, top: [], counts: [] }} />)).toBe(
      '',
    );
  });
});
