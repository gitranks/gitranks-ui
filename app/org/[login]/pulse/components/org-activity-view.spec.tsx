import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { OrgActivityData } from './org-activity.utils';
import { OrgActivityView, type OrgActivityViewState } from './org-activity-view';
import { OrgActivityGroupBy } from '@/types/generated/graphql';

const chart: OrgActivityData = {
  months: ['2024-11', '2024-12', '2025-01'],
  series: [
    { label: 'TypeScript', shares: [0.6, 0, 0.5] },
    { label: 'Tests · TS', shares: [0.3, 0, 0.25] },
    { label: 'Other', shares: [0.1, 0, 0.25] },
  ],
  commits: [40, 0, 120],
  lowVolume: [false, true, false],
  otherUnknownShare: 0.0234,
  computedAt: '2026-10-18T02:00:00.000Z',
  scopeNote: '3 public repositories with 5+ stars, pushed in the last 5 years',
};

const render = (state: OrgActivityViewState, groupBy = OrgActivityGroupBy.Type) =>
  renderToStaticMarkup(
    <OrgActivityView groupBy={groupBy} state={state} onGroupByChange={() => {}} onRetry={() => {}} />,
  ).replaceAll('&#x27;', "'");

describe('OrgActivityView', () => {
  it('says plainly that an org without data is not covered, with no switch', () => {
    const html = render({ status: 'empty' });

    expect(html).toContain("This organization isn't covered yet.");
    expect(html).not.toContain('Group by');
  });

  it('offers a retry when the chart fails to load', () => {
    const html = render({ status: 'error' });

    expect(html).toContain("The chart couldn't load.");
    expect(html).toContain('Try again');
  });

  it('renders the group-by switch as pressed buttons', () => {
    const html = render({ status: 'loading' }, OrgActivityGroupBy.Language);

    expect(html).toContain('<legend class="sr-only">Group by</legend>');
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Type<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Language<\/button>/);
    expect(html).toContain('Activity by language');
  });

  it('lists each series at the first and last month, with the scope and the other/unknown share', () => {
    const html = render({ status: 'loaded', chart, groupBy: OrgActivityGroupBy.Type });

    expect(html).toContain('aria-label="Activity by type: a 100% stacked area chart');
    expect(html).toContain('3 months from Nov 2024 to Jan 2025');
    expect(html).toMatch(/<th scope="col"[^>]*>Nov 2024<\/th>/);
    expect(html).toMatch(/<th scope="col"[^>]*>Jan 2025<\/th>/);
    expect(html).toMatch(/TypeScript<\/span><\/th><td[^>]*>60\.0%<\/td><td[^>]*>50\.0%<\/td>/);
    expect(html).toMatch(/Tests · TS<\/span><\/th><td[^>]*>30\.0%<\/td><td[^>]*>25\.0%<\/td>/);
    expect(html).toContain('Hatched: months with fewer than 30 commits.');
    expect(html).toContain('2.3%');
    expect(html).toContain('Counted: 3 public repositories with 5+ stars, pushed in the last 5 years.');
    expect(html).toContain('Updated Oct 18, 2026.');
  });

  it('shows a dash for a first or last month with no counted changes', () => {
    const html = render({
      status: 'loaded',
      chart: { ...chart, series: chart.series.map((s) => ({ ...s, shares: [s.shares[0], s.shares[1], 0] })) },
      groupBy: OrgActivityGroupBy.Type,
    });

    expect(html).toMatch(/TypeScript<\/span><\/th><td[^>]*>60\.0%<\/td><td[^>]*>—<\/td>/);
  });

  it('labels the table by the grouping of the chart on screen while the next one loads', () => {
    const html = render(
      { status: 'loaded', chart, groupBy: OrgActivityGroupBy.Type, refreshing: true },
      OrgActivityGroupBy.Kind,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Activity by type: a 100% stacked area chart');
  });
});
