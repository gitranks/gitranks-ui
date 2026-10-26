import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContributorsChartView } from './pulse-contributors-chart';

describe('ContributorsChartView', () => {
  it('says so when there is no monthly data, instead of leaving the heading alone', () => {
    expect(renderToStaticMarkup(<ContributorsChartView state={{ status: 'empty' }} onRetry={() => {}} />)).toContain(
      'No monthly data yet.',
    );
  });
});
