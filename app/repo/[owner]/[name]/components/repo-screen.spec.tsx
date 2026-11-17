import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bigRepo, bigRepoPulse, repoLanguages, repoRankTiers, youngRepo, youngRepoFacts } from '../__fixtures__/repo';
import { buildRepoSEO } from '../seo';
import { RepoContributorsSections } from './repo-contributors-sections';
import { RepoOverviewSections } from './repo-overview-sections';
import { RepoPulseArea } from './repo-pulse-area';
import { RepoScreen } from './repo-screen';
import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { repoBig } from '@/badge/v3/fixtures';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { JsonLd } from '@/components/json-ld/json-ld';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'loading' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// The day the fixtures are set on: the badges a page promotes depend on the date.
const NOW = Date.parse('2026-10-28T12:00:00Z');

/** The big repository with analytics, and the young one without: the two the design catalogue draws. */
const big = {
  repo: bigRepo,
  pulse: bigRepoPulse,
  languages: repoLanguages,
  tiers: repoRankTiers,
  badgeFacts: repoBig,
};
const young = { ...big, repo: youngRepo, pulse: null, badgeFacts: youngRepoFacts };

/** The big repository ranked without a tier: its two ranks show as cards. */
const untiered = { ...bigRepo, rank: bigRepo.rank && { ...bigRepo.rank, tier: null, languageTier: null } };

// React's generated ids name a place in the tree, which a part rendered on its own does not share.
const render = (element: ReactElement) => renderToStaticMarkup(element).replace(/_R_[0-9a-z]+_/g, '_R_');

const JSON_LD = '<script type="application/ld+json">';

/** The main column's content: from the JSON-LD, its first child, to the column's end. */
const mainColumn = (html: string) => html.slice(html.indexOf(JSON_LD), html.lastIndexOf('</section>'));

const text = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&#x27;', "'");

/** The section headings, in the order the markup has them. */
const headings = (html: string) => [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(([, inner]) => text(inner));

const OVERVIEW = ['Repository tier', 'Who builds it', 'Starred by the best', 'Star history'];
const ANALYTICS = ['Code', 'Contributors', "Top contributors' countries"];
const NOTE = 'Code and contributor analytics appear for repositories with 1,000+ stars.';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RepoScreen', () => {
  it.each([
    ['the big repository with analytics', big],
    ['the young repository', young],
  ])('fills the main column with the JSON-LD, the overview, the badges and the analytics for %s', (_, props) => {
    const html = render(<RepoScreen {...props} />);
    const parts = [
      <JsonLd key="json-ld" payloads={buildRepoSEO(props.repo).jsonLd} />,
      <RepoOverviewSections key="overview" repo={props.repo} languages={props.languages} tiers={props.tiers} />,
      <BadgesCard key="badges" entity={props.badgeFacts} />,
      <RepoContributorsSections key="contributors" repo={props.repo} pulse={props.pulse} />,
    ].map(render);

    expect(parts).not.toContain('');
    expect(mainColumn(html)).toBe(parts.join(''));
    // Nothing between the column's start and its JSON-LD, and nothing after the column but the page's end.
    expect(html.slice(0, html.indexOf(JSON_LD))).toMatch(/<\/div><section class="[^"]*">$/);
    expect(html.slice(html.lastIndexOf('</section>'))).toBe('</section></main>');
  });

  it('draws the sections in their order: the overview, the badges, the analytics', () => {
    expect(headings(render(<RepoScreen {...big} />))).toEqual([...OVERVIEW, 'Badges', ...ANALYTICS]);
  });

  it('ends a young repository with the note on why it has no analytics', () => {
    const html = render(<RepoScreen {...young} />);

    expect(headings(html)).toEqual(['Repository tier', 'Who builds it', 'Star history', 'Badges']);
    expect(mainColumn(html).endsWith(`${NOTE}</p>`)).toBe(true);
  });

  it('draws the left column once, before the main column', () => {
    const html = render(<RepoScreen {...big} />);

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf(JSON_LD));
    expect(html.match(/application\/ld\+json/g)).toHaveLength(buildRepoSEO(bigRepo).jsonLd.filter(Boolean).length);
  });
});

describe('RepoOverviewSections', () => {
  const overview = (repo = bigRepo) =>
    render(<RepoOverviewSections repo={repo} languages={repoLanguages} tiers={repoRankTiers} />);

  it('draws the first row of cards, Starred by the best, the summary and the star history', () => {
    const html = overview();
    const at = [
      'Who builds it',
      'aria-label="Starred by the best"',
      'id="profile-summary"',
      '<h2>Star history</h2>',
    ].map((part) => html.indexOf(part));

    expect(headings(html)).toEqual(OVERVIEW);
    expect(at).not.toContain(-1);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('draws no badges, analytics or JSON-LD', () => {
    const html = overview();

    expect(html).not.toContain('Badges');
    expect(html).not.toContain('repo-pulse');
    expect(html).not.toContain(JSON_LD);
    expect(overview(youngRepo)).not.toContain(NOTE);
  });

  it('shows the two ranks as cards when the repository has no tier', () => {
    expect(headings(overview(untiered))).toEqual(['Global rank', 'TypeScript rank', ...OVERVIEW.slice(1)]);
  });

  it('shows a rank card only for a rank the repository has', () => {
    const html = overview({ ...untiered, rank: untiered.rank && { ...untiered.rank, l: null } });

    expect(headings(html)).toEqual(['Global rank', ...OVERVIEW.slice(1)]);
  });

  it('says why a repository without a rank has none', () => {
    const waiting = overview({ ...youngRepo, rank: null });
    const small = overview({ ...youngRepo, stars: REPO_MIN_RANK_STARS - 1 });

    expect(waiting).toContain('Not ranked yet: the repository joins the rankings at their next update.');
    expect(small).toContain(`Repositories are ranked from ${REPO_MIN_RANK_STARS} stars.`);
    expect(headings(waiting)).toEqual(['Who builds it', 'Star history']);
    expect(headings(small)).toEqual(['Who builds it', 'Star history']);
  });
});

describe('RepoContributorsSections', () => {
  const contributors = (repo = bigRepo, pulse: typeof bigRepoPulse | null = bigRepoPulse) =>
    render(<RepoContributorsSections repo={repo} pulse={pulse} />);

  it('draws the analytics: Code, Contributors and the countries', () => {
    const html = contributors();
    const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map(([, id]) => id);

    expect(headings(html)).toEqual(ANALYTICS);
    expect(ids).toEqual(['repo-pulse-code', 'repo-pulse-contributors', 'repo-pulse-countries']);
    expect(html).toContain('Top contributors');
  });

  it('draws nothing of the overview or the badges', () => {
    const html = contributors();

    for (const heading of [...OVERVIEW, 'Badges']) {
      expect(html).not.toContain(heading);
    }
    expect(html).not.toContain('id="profile-summary"');
    expect(html).not.toContain(JSON_LD);
  });

  it.each([
    ['with analytics', bigRepo, bigRepoPulse],
    ['under the star threshold', youngRepo, null],
    ['over the threshold without analytics yet', bigRepo, null],
  ])('is the analytics area as it is: %s', (_, repo, pulse) => {
    expect(contributors(repo, pulse)).toBe(render(<RepoPulseArea repo={repo} pulse={pulse} />));
  });

  it('explains the threshold to a young repository, and shows nothing over it until there are analytics', () => {
    expect(contributors(youngRepo, null)).toBe(`<p class="text-sm text-muted-foreground">${NOTE}</p>`);
    expect(contributors(bigRepo, null)).toBe('');
  });
});
