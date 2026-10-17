import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BadgeForm } from './badge-form';
import { BadgeContext } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

const render = (searchParams: string, props: ComponentProps<typeof BadgeForm> = {}) =>
  renderToStaticMarkup(
    <NuqsTestingAdapter searchParams={searchParams}>
      <BadgeForm {...props} />
    </NuqsTestingAdapter>,
  );

const countryRadio = (html: string) => html.match(/<button[^>]*value="country"[^>]*>/)?.[0];

describe('BadgeForm', () => {
  it('starts with the label of the ranking and type when none is given', () => {
    expect(render('?ranking=c')).toContain('value="Contributor Rank"');
    expect(render('?ranking=f&type=score')).toContain('value="Total Followers"');
  });

  it('keeps a given label', () => {
    expect(render('?ranking=c&label=My+contributions')).toContain('value="My contributions"');
  });

  it('disables Country for a profile with no country', () => {
    const html = render('', {
      rankedIn: { [BadgeContext.Global]: [UserRankProp.s], [BadgeContext.Country]: [] },
      country: null,
    });

    expect(countryRadio(html)).toContain(' disabled=""');
    expect(html).toContain('Country (not detected)');
  });

  it('disables Country for a profile with no rank in its country', () => {
    const html = render('', {
      rankedIn: { [BadgeContext.Global]: [UserRankProp.s], [BadgeContext.Country]: [] },
      country: 'Ukraine',
    });

    expect(countryRadio(html)).toContain(' disabled=""');
    expect(html).toContain('Country (not ranked)');
  });

  it('offers Country for a profile ranked there, and before a profile is chosen', () => {
    const ranked = render('', {
      rankedIn: { [BadgeContext.Global]: [UserRankProp.s], [BadgeContext.Country]: [UserRankProp.s] },
      country: 'Ukraine',
    });

    expect(countryRadio(ranked)).not.toContain(' disabled=""');
    expect(countryRadio(render(''))).not.toContain(' disabled=""');
    expect(render('')).toContain('>Country</label>');
  });
});
