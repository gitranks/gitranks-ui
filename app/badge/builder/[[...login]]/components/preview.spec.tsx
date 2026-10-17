import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { IntegrationCode } from './integration-code';
import { Preview } from './preview';
import { UserRankProp } from '@/types/ranking.types';

const profile = { githubLogin: 'newcomer', githubId: 'U_1', rankedIn: [UserRankProp.s, UserRankProp.c] };

const render = (searchParams: string, node: ReactNode) =>
  renderToStaticMarkup(<NuqsTestingAdapter searchParams={searchParams}>{node}</NuqsTestingAdapter>);

describe('badge builder for a ranking the profile is not in', () => {
  it('explains why instead of previewing an error badge', () => {
    const html = render('?ranking=f', <Preview {...profile} />);

    expect(html).not.toContain('<img');
    expect(html).toContain(
      'newcomer is not in the Followers Ranking yet: it takes 5 followers. Choose another ranking.',
    );
  });

  it('offers no embed code', () => {
    const html = render('?ranking=f', <IntegrationCode {...profile} />);

    expect(html).not.toContain('/api/badge/v2/');
  });

  it('still previews and embeds the rankings the profile is in', () => {
    expect(render('?ranking=c', <Preview {...profile} />)).toContain('/api/badge/v2/newcomer?ranking=c');
    expect(render('?ranking=c', <IntegrationCode {...profile} />)).toContain('/api/badge/v2/newcomer?ranking=c');
  });

  it('does not suggest another ranking to a profile that is in none', () => {
    const html = render('', <Preview {...profile} rankedIn={[]} />);

    expect(html).toContain(
      'newcomer is not in any ranking yet: it takes 5 stars, 5 followers, or a merged PR in a 5★ repo.',
    );
  });
});
