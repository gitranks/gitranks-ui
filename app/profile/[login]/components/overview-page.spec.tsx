import type { PropsWithChildren } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { type ProfileUser, rankedProfile, profileUser as user } from '../__fixtures__/overview';
import { OverviewPage } from './overview-page';

// The left column needs a signed-in session and route params; the cards are all this spec reads.
vi.mock('./layout-left-column', () => ({ LayoutLeftColumn: ({ children }: PropsWithChildren) => children }));
// The owner's "Issues for you" block reads the session in the browser; a signed-out visitor sees nothing of it.
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));

// The first percentage line after the card's title, with React's text-node separators removed.
const contributionsRankLine = (rankGlobal: ProfileUser['rankGlobal']) =>
  renderToStaticMarkup(<OverviewPage user={user(rankGlobal)} isGlobalContext />)
    .replaceAll('<!-- -->', '')
    .split('Open source contributions')[1]
    ?.match(/(Top|Bottom) [\d.]+% of ranked profiles/)?.[0];

describe('OverviewPage', () => {
  it('rates the contributions card by the contributions rank, not the stars rank', () => {
    expect(contributionsRankLine({ s: 50, c: 200 })).toBe('Top 10% of ranked profiles');
  });

  it('prefers the provisional contributions rank, as the stars card does', () => {
    expect(contributionsRankLine({ s: 50, c: 200, cProvisional: 300 })).toBe('Top 15% of ranked profiles');
  });
});

// The page as text, the way a reader of the HTML gets it: a space between elements, none inside a sentence.
const pageText = (props: Parameters<typeof OverviewPage>[0]) =>
  renderToStaticMarkup(<OverviewPage {...props} />)
    .replaceAll('<!-- -->', '')
    .replace(/<\/?(a|span|time)\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

describe('OverviewPage text', () => {
  const ranked = rankedProfile;

  it('labels each rank on the card with its ranking and scope, tiers or not', () => {
    const text = pageText({ user: ranked, isGlobalContext: true });

    expect(text).toContain('Stars Rank worldwide: #50');
    expect(text).toContain('Contributor Rank worldwide: #200');
    expect(text).toContain('Followers Rank worldwide: #7');
    expect(pageText({ user: ranked })).toContain('Stars Rank in Germany: #4');
  });

  it('marks a provisional rank in the card label', () => {
    expect(pageText({ user: { ...ranked, rankGlobal: { sProvisional: 42 } }, isGlobalContext: true })).toContain(
      'Stars Rank worldwide (provisional): #42',
    );
  });

  it('names no scope on the country tab of a profile without a country', () => {
    const text = pageText({ user: { ...ranked, country: null, rankCountry: null } });

    expect(text).toContain('Stars Rank: N/A');
    expect(text).not.toContain('worldwide:');
    expect(text).not.toContain('Rank history');
  });

  it('sets the summary as muted small text right below the four cards, links in its color', () => {
    const markup = renderToStaticMarkup(<OverviewPage user={ranked} isGlobalContext />);
    const summary = markup.indexOf('data-testid="profile-summary"');
    const lastCard = markup.indexOf('Open source contributions');
    const repositories = markup.indexOf('>Repositories</h3>');

    expect(lastCard).toBeGreaterThan(-1);
    expect(repositories).toBeGreaterThan(-1);
    expect(summary).toBeGreaterThan(lastCard);
    expect(summary).toBeLessThan(repositories);
    expect(markup).toContain('<p class="text-sm text-muted-foreground" data-testid="profile-summary">');
    const linkClasses = [...markup.slice(summary, markup.indexOf('</p>', summary)).matchAll(/<a class="([^"]*)"/g)].map(
      ([, classes]) => classes.split(' '),
    );

    expect(linkClasses.length).toBeGreaterThan(0);
    for (const classes of linkClasses) {
      expect(classes).toEqual(expect.arrayContaining(['text-inherit', 'hover:text-foreground', 'underline']));
      expect(classes.filter((name) => name.includes('text-link'))).toEqual([]);
    }
  });

  it('summarizes the profile, citing the ranked counts it was given', () => {
    const text = pageText({
      user: ranked,
      extras: {
        rankedGlobal: { sUsers: 1000, cUsers: 0, fUsers: 0 },
        rankedCountry: { sUsers: 100, cUsers: 0, fUsers: 0 },
        complete: true,
      },
      isGlobalContext: true,
    });

    expect(text).toContain(
      '@contributor is ranked #50 of 1,000 developers worldwide by stars on their own repositories (120 stars) and #4 of 100 in Germany.',
    );
  });

  it('lists the rank history of the tab’s scope', () => {
    expect(pageText({ user: ranked, isGlobalContext: true })).toContain(
      'Ranks worldwide now and at the start of each month.',
    );
    expect(pageText({ user: ranked, isGlobalContext: true })).toContain('Oct 1, 2026 #60 (100 stars)');
    expect(pageText({ user: { ...ranked, rankCountry: { s: 4, snapshots: { '2026-10-01': { s: 5 } } } } })).toContain(
      'Ranks in Germany now and at the start of each month.',
    );
  });
});
