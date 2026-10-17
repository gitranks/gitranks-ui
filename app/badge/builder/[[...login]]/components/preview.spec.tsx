import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { IntegrationCode } from './integration-code';
import { Preview } from './preview';
import { BadgeContext } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

const profile = {
  githubLogin: 'newcomer',
  githubId: 'U_1',
  rankedIn: {
    [BadgeContext.Global]: [UserRankProp.s, UserRankProp.c],
    [BadgeContext.Country]: [UserRankProp.s],
  },
  country: 'United States',
};

const noCountry = {
  ...profile,
  rankedIn: { [BadgeContext.Global]: [UserRankProp.s, UserRankProp.c], [BadgeContext.Country]: [] },
  country: null,
};

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
    const none = { [BadgeContext.Global]: [], [BadgeContext.Country]: [] };

    for (const searchParams of ['', '?context=country']) {
      expect(render(searchParams, <Preview {...profile} rankedIn={none} />)).toContain(
        'newcomer is not in any ranking yet: it takes 5 stars, 5 followers, or a merged PR in a 5★ repo.',
      );
    }
  });
});

describe('badge builder for a country badge', () => {
  it('previews and embeds the country rankings the profile is in', () => {
    const embed = '/api/badge/v2/newcomer?ranking=s&amp;context=country';

    expect(render('?context=country', <Preview {...profile} />)).toContain(`<img src="${embed}`);
    expect(render('?context=country', <IntegrationCode {...profile} />)).toContain(embed);
  });

  it('explains a profile with no country instead of previewing an error badge', () => {
    const html = render('?context=country', <Preview {...noCountry} />);

    expect(html).not.toContain('<img');
    expect(html).toContain(
      'newcomer has no country rank: GitRanks could not detect a country from the profile location. Choose Global.',
    );
    expect(render('?context=country', <IntegrationCode {...noCountry} />)).not.toContain('/api/badge/v2/');
  });

  it('explains a ranking the profile is in globally but not in its country', () => {
    const html = render('?context=country&ranking=c', <Preview {...profile} />);

    expect(html).not.toContain('<img');
    expect(html).toContain('newcomer has no Contributor Rank in USA yet. Choose Global or another ranking.');
    expect(render('?context=country&ranking=c', <IntegrationCode {...profile} />)).not.toContain('/api/badge/v2/');
  });

  it('explains a ranking the profile is in nowhere by its entry score', () => {
    expect(render('?context=country&ranking=f', <Preview {...profile} />)).toContain(
      'newcomer is not in the Followers Ranking yet: it takes 5 followers. Choose another ranking.',
    );
  });

  it('points to Global alone when no ranking has a country rank', () => {
    const noCountryRanks = {
      ...profile,
      rankedIn: { [BadgeContext.Global]: [UserRankProp.s], [BadgeContext.Country]: [] },
      country: 'Ukraine',
    };

    expect(render('?context=country&ranking=s', <Preview {...noCountryRanks} />)).toContain(
      'newcomer has no Stars Rank in Ukraine yet. Choose Global.',
    );
    expect(render('?context=country&ranking=f', <Preview {...noCountryRanks} />)).toContain(
      'newcomer is not in the Followers Ranking yet: it takes 5 followers. Choose Global.',
    );
  });

  it('does not call a profile ranked only in its country unranked', () => {
    const countryOnly = {
      ...profile,
      rankedIn: { [BadgeContext.Global]: [], [BadgeContext.Country]: [UserRankProp.s] },
    };

    expect(render('?context=country&ranking=s', <Preview {...countryOnly} />)).toContain('<img');
    expect(render('?context=country&ranking=c', <Preview {...countryOnly} />)).not.toContain('not in any ranking');
  });
});

describe('badge builder label', () => {
  const embedOf = (searchParams: string) => render(searchParams, <IntegrationCode {...profile} />);

  it('follows the ranking and the type when none is given', () => {
    expect(embedOf('')).toContain('label=Stars+Rank');
    expect(embedOf('?ranking=c')).toContain('label=Contributor+Rank');
    expect(embedOf('?ranking=c&type=score')).toContain('label=Contribution+Score');
  });

  it('keeps a given label', () => {
    expect(embedOf('?ranking=c&label=My+contributions')).toContain('label=My+contributions');
  });

  it('leaves out a label that was cleared', () => {
    const html = embedOf('?ranking=c&label=');

    expect(html).toContain('/api/badge/v2/newcomer?ranking=c');
    expect(html).not.toContain('&amp;label=');
  });
});

describe('badge builder embed code', () => {
  // The code as a reader copies it: the textarea value, unescaped.
  const codeOf = (searchParams: string) =>
    (render(searchParams, <IntegrationCode {...profile} />).match(/<textarea[^>]*>([^<]*)<\/textarea>/)?.[1] ?? '')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&amp;', '&');

  it('links the badge to the profile it shows', () => {
    const code = codeOf('?ranking=c');

    expect(code).toMatch(/^<a href="\/profile\/newcomer"><img src="\/api\/badge\/v2\/newcomer\?ranking=c&[^"]+" /);
    expect(code).toMatch(/ alt="GitRanks badge for newcomer" \/><\/a>$/);
  });

  it('links a country badge to the country tab', () => {
    expect(codeOf('?context=country')).toMatch(/^<a href="\/profile\/newcomer\/country"><img /);
  });

  it('is empty when there is no badge to embed', () => {
    expect(codeOf('?ranking=f')).toBe('');
  });
});
