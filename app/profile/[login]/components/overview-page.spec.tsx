import type { PropsWithChildren } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OverviewPage } from './overview-page';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';

// The left column needs a signed-in session and route params; the cards are all this spec reads.
vi.mock('./layout-left-column', () => ({ LayoutLeftColumn: ({ children }: PropsWithChildren) => children }));

type User = NonNullable<PageProfileOverviewQuery['user']>;

const user = (rankGlobal: User['rankGlobal']): User => ({
  githubId: '1',
  login: 'contributor',
  avatarUrl: 'https://avatars.example/1',
  s: 120,
  c: 40,
  repositoriesCount: 3,
  contributedRepoCount: 5,
  rankGlobal,
  tiersGlobal: { sUsers: 1000, cUsers: 2000, fUsers: 3000, sTiers: [], cTiers: [], fTiers: [] },
});

// The first percentage line after the card's title, with React's text-node separators removed.
const contributionsRankLine = (rankGlobal: User['rankGlobal']) =>
  renderToStaticMarkup(<OverviewPage user={user(rankGlobal)} isGlobalContext />)
    .replaceAll('<!-- -->', '')
    .split('Open Source Contributions')[1]
    ?.match(/(Top|Bottom) [\d.]+% of ranked profiles/)?.[0];

describe('OverviewPage', () => {
  it('rates the contributions card by the contributions rank, not the stars rank', () => {
    expect(contributionsRankLine({ s: 50, c: 200 })).toBe('Top 10% of ranked profiles');
  });

  it('prefers the provisional contributions rank, as the stars card does', () => {
    expect(contributionsRankLine({ s: 50, c: 200, cProvisional: 300 })).toBe('Top 15% of ranked profiles');
  });
});
