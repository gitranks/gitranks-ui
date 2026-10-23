import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { facts } from './org-pulse.fixtures';
import { ContributorsTableView } from './org-pulse-contributors-table';
import {
  type ContributorsTableState,
  contributorsTableReducer,
  initialTableState,
} from './org-pulse-contributors-table.state';
import { OrgPulseContributorSort } from '@/types/generated/graphql';

const base = initialTableState(facts.topContributors, 4);
const page = { total: 2, unlinkedAuthors: 1, labels: ['TypeScript', 'Rust'], items: facts.topContributors };
const live: ContributorsTableState = contributorsTableReducer(
  { ...base, pending: { id: 1, query: base.query, offset: 0, first: 25, replace: true }, lastId: 1 },
  { type: 'loaded', id: 1, page },
);

const render = (state: ContributorsTableState, interactive = true) =>
  renderToStaticMarkup(
    <ContributorsTableView
      state={state}
      interactive={interactive}
      onQueryChange={() => {}}
      onShowMore={() => {}}
      onRetry={() => {}}
      onLabelsWanted={() => {}}
    />,
  ).replaceAll('&#x27;', "'");

describe('ContributorsTableView', () => {
  it('renders period and sort as pressed buttons', () => {
    const html = render({ ...live, query: { ...live.query, sortBy: OrgPulseContributorSort.Commits } });

    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>12 months<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>3 months<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Commits<\/button>/);
    expect(html).toMatch(/<th scope="col" aria-sort="descending">Commits<\/th>/);
    expect(html).toContain('Contributors by commits, last 12 months.');
  });

  it('marks no column as sorted for lines, which no single column holds', () => {
    const html = render(live);

    expect(html).not.toContain('aria-sort="');
    expect(html).toContain('Contributors by lines (added + deleted), last 12 months.');
  });

  it('shows raw counts with no rank column', () => {
    const html = render(live);

    expect(html).toContain('>700<');
    expect(html).toContain('>200<');
    expect(html).not.toMatch(/>#<|Rank/);
  });

  it('links to a gitranks profile only when gitranks holds it, and to GitHub, not followed, otherwise', () => {
    const html = render(live);

    expect(html).toContain('href="/profile/octo-dev"');
    expect(html).not.toContain('href="/profile/second-dev"');
    expect(html).toMatch(/<a href="https:\/\/github.com\/second-dev" rel="nofollow noopener"/);
  });

  it('skips a row with no login', () => {
    const html = render(live);

    expect(html).not.toContain('href="/profile/"');
    expect(html).not.toContain('href="https://github.com/"');
    expect(html.match(/<tr>/g)).toHaveLength(3); // the header row and two contributors
  });

  it("sorts a label table by that label's lines only", () => {
    const html = render({ ...live, query: { ...live.query, label: 'Rust' } });

    expect(html).not.toContain('<legend class="sr-only">Sort by</legend>');
    expect(html).toContain('Contributors with the most Rust lines');
  });

  it('leaves the controls out before hydration but keeps the rows', () => {
    const html = render(base, false);

    expect(html).not.toContain('aria-pressed');
    expect(html).not.toContain('Show more');
    expect(html).toContain('href="/profile/octo-dev"');
  });

  it('does not dim the server rows or show an error before any request', () => {
    const html = render(base);

    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain("couldn't load");
  });

  it('offers a retry when a page fails', () => {
    const html = render({ ...live, failed: { id: 2, query: live.query, offset: 0, first: 25, replace: true } });

    expect(html).toContain("The contributors couldn't load.");
    expect(html).toContain('Try again');
  });
});
