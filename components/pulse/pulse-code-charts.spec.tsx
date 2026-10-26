import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PulseCodeChartsView } from './pulse-code-charts';
import type { LinesViewState } from './pulse-series-provider';
import { OrgActivityGroupBy } from '@/types/generated/graphql';

const render = (state: LinesViewState, groupBy = OrgActivityGroupBy.Type) =>
  renderToStaticMarkup(
    <PulseCodeChartsView groupBy={groupBy} state={state} onGroupByChange={() => {}} onRetry={() => {}} />,
  ).replaceAll('&#x27;', "'");

describe('PulseCodeChartsView', () => {
  it('renders one Type / Language / Kind switch as pressed buttons', () => {
    const html = render({ status: 'loading' }, OrgActivityGroupBy.Language);

    expect(html).toContain('<legend class="sr-only">Group the lines charts by</legend>');
    expect(html).toMatch(/<button[^>]*aria-pressed="true"[^>]*>Language<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Type<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Kind<\/button>/);
  });

  it('announces the loading state', () => {
    expect(render({ status: 'loading' })).toContain('<span class="sr-only">Loading the lines charts</span>');
  });

  it('offers a retry after a failed request, keeping the switch', () => {
    const html = render({ status: 'error' });

    expect(html).toContain("The lines charts couldn't load.");
    expect(html).toContain('Try again');
    expect(html).toContain('aria-pressed');
  });

  it('drops the switch only when no grouping has lines', () => {
    expect(render({ status: 'empty' })).not.toContain('aria-pressed');
    expect(render({ status: 'empty', switchable: true })).toContain('No counted lines for this grouping.');
  });
});
