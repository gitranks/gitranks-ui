import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { type Leaderboard, type LeaderboardRow, LeaderboardTabs } from './leaderboard-tabs';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }));

const row = (login: string, value: number, notCounted: LeaderboardRow['notCounted'] = null): LeaderboardRow => ({
  position: 1,
  previous: 1,
  login,
  avatarUrl: null,
  flag: null,
  country: null,
  location: null,
  value,
  notCounted,
});

const board = (rows: LeaderboardRow[]): Leaderboard[] => [
  { key: 's', tab: 'Stars', valueLabel: 'Stars', href: '/by/stars/1', rows },
];

describe('LeaderboardTabs', () => {
  it('shows a plain total while every star counts', () => {
    const html = renderToStaticMarkup(<LeaderboardTabs boards={board([row('ana-dev', 264_651)])} />);

    expect(html).toContain('264,651');
    expect(html).not.toContain('<s ');
  });

  it('strikes the total with the stars not counted through before the honest one', () => {
    const html = renderToStaticMarkup(
      <LeaderboardTabs boards={board([row('cy-labs', 156_000, { stars: 12_300, repositories: 2 })])} />,
    );

    expect(html).toMatch(/<s [^>]*>.*168,300.*<\/s><span>156,000<\/span>/);
  });
});
