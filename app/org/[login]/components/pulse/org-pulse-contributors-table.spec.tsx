import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { facts } from './org-pulse.fixtures';
import {
  type ContributorsQuery,
  type ContributorsTableData,
  ContributorsTableView,
} from './org-pulse-contributors-table';
import { OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';

const query: ContributorsQuery = {
  period: OrgPulsePeriod.Last_12Months,
  sortBy: OrgPulseContributorSort.Lines,
  label: null,
};

const data: ContributorsTableData = {
  items: facts.topContributors,
  total: 2,
  unlinkedAuthors: 1,
  labels: ['TypeScript', 'Rust'],
};

const render = (props: Partial<Parameters<typeof ContributorsTableView>[0]> = {}) =>
  renderToStaticMarkup(
    <ContributorsTableView
      query={query}
      data={data}
      visible={25}
      status="idle"
      onQueryChange={() => {}}
      onShowMore={() => {}}
      onRetry={() => {}}
      {...props}
    />,
  ).replaceAll('&#x27;', "'");

describe('ContributorsTableView', () => {
  it('renders period and sort as pressed buttons', () => {
    const html = render({ query: { ...query, sortBy: OrgPulseContributorSort.Commits } });

    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>12 months<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>3 months<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Commits<\/button>/);
    expect(html).toContain('aria-sort="descending"');
    expect(html).toContain('Contributors by commits, last 12 months.');
  });

  it('shows raw counts with no rank column', () => {
    const html = render();

    expect(html).toContain('>700<');
    expect(html).toContain('>200<');
    expect(html).not.toMatch(/>#<|Rank/);
  });

  it('offers a label filter once labels are known', () => {
    expect(render()).toContain('Language');
    expect(render({ data: { ...data, labels: null } })).not.toContain('All languages');
  });

  it("sorts a label table by that label's lines only", () => {
    const html = render({ query: { ...query, label: 'Rust' } });

    expect(html).not.toContain('<legend class="sr-only">Sort by</legend>');
    expect(html).toContain('Contributors with the most Rust lines');
  });

  it('offers more rows only while the API holds more', () => {
    expect(render({ visible: 1 })).toContain('Show more');
    expect(render()).not.toContain('Show more');
    expect(render({ data: { ...data, total: null }, visible: 2 })).toContain('Show more');
  });

  it('leaves the controls out before hydration but keeps the rows', () => {
    const html = render({ interactive: false, visible: 1 });

    expect(html).not.toContain('aria-pressed');
    expect(html).not.toContain('Show more');
    expect(html).toContain('href="/profile/octo-dev"');
  });

  it('offers a retry when a page fails', () => {
    const html = render({ status: 'error' });

    expect(html).toContain("The contributors couldn't load.");
    expect(html).toContain('Try again');
  });
});
