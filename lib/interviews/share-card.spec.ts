import { describe, expect, it } from 'vitest';

import { interviewsHome, northwindPage, tallgrassPage } from './__fixtures__/companies';
import { northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import {
  cardAddressSizeOf,
  cardNoticeOf,
  cardTitleSizeOf,
  cardTitleTextOf,
  cardTopOf,
  companyCardAddressOf,
  companyCardLineOf,
  companyCardTitleOf,
  companyCardUrlOf,
  companyCardVersionOf,
  INTERVIEWS_CARD_ADDRESS,
  interviewsCardUrlOf,
  interviewsCardVersionOf,
  planCardAddressOf,
  planCardLineOf,
  planCardTitleOf,
  planCardUrlOf,
  planCardVersionOf,
} from './share-card';
import type { InterviewCompanyRef } from './types';

const company = (slug: string, logo = true): InterviewCompanyRef => ({ slug, name: slug.toUpperCase(), logo });

describe("Interviews' pictures: what they say", () => {
  it("names a company's picture and counts its plans and positions, never a zero", () => {
    expect(companyCardTitleOf(northwindPage.company)).toBe('Northwind interviews');
    expect(companyCardLineOf(northwindPage)).toBe('7 plans for 3 positions');
    expect(companyCardLineOf(tallgrassPage)).toBe('1 plan for 1 position');
    expect(companyCardLineOf({ positions: [] })).toBeNull();
    expect(companyCardLineOf({ positions: [{ position: tallgrassPage.positions[0].position, plans: [] }] })).toBeNull();
  });

  it("names a plan's picture with its company, and its rounds in one line", () => {
    expect(planCardTitleOf(northwindSeniorPlan)).toBe('Northwind · Senior software engineer');
    expect(planCardLineOf(northwindSeniorPlan)).toBe('5 rounds, from the recruiter call to the values interview');
    expect(planCardLineOf(tallgrassSrePlan)).toBe('3 rounds, from the recruiter call to the systems interview');
    expect(planCardLineOf({ rounds: [northwindSeniorPlan.rounds[0]] })).toBe('1 round: the recruiter call');
    expect(planCardLineOf({ rounds: [] })).toBeNull();
  });

  it('keeps a round title written in capitals as it is', () => {
    const rounds = [
      { ...northwindSeniorPlan.rounds[0], title: 'HR screen' },
      { ...northwindSeniorPlan.rounds[1], title: 'Values interview' },
    ];
    expect(planCardLineOf({ rounds })).toBe('2 rounds, from the HR screen to the values interview');
  });

  it('says every company or plan picture is not official', () => {
    expect(cardNoticeOf('Northwind')).toBe('Not an official Northwind page');
  });

  it('draws a short company name large, and a plan or a long name smaller, on up to three lines', () => {
    expect(cardTitleSizeOf('Northwind interviews', 'company')).toBe(62);
    expect(cardTitleSizeOf('Northwind Traders International interviews', 'company')).toBe(50);
    expect(cardTitleSizeOf('Northwind · Senior software engineer', 'plan')).toBe(50);
    const long = `Northwind · ${'Site reliability engineer, mid level and senior '.repeat(3)}`;
    const drawn = cardTitleTextOf(long);
    expect(drawn.length).toBeLessThanOrEqual(96);
    expect(drawn.endsWith('…')).toBe(true);
    expect(cardTitleTextOf('Northwind  ·\nSenior')).toBe('Northwind · Senior');
  });

  it('prints the page at the foot, a plan cut after its company', () => {
    expect(INTERVIEWS_CARD_ADDRESS).toBe('gitranks.com/interviews');
    expect(companyCardAddressOf('northwind')).toBe('gitranks.com/interviews/northwind');
    expect(planCardAddressOf('northwind')).toBe('gitranks.com/interviews/northwind/…');
    expect(cardAddressSizeOf('gitranks.com/interviews/northwind')).toBe(24);
    expect(cardAddressSizeOf(`gitranks.com/interviews/${'a'.repeat(40)}`)).toBe(20);
  });

  it('shows the top five companies, in order, and none from an empty read', () => {
    const top = ['a', 'b', 'c', 'd', 'e', 'f'].map((slug) => company(slug));
    expect(cardTopOf({ top }).map((one) => one.slug)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(cardTopOf(interviewsHome)).toEqual(interviewsHome.top);
    expect(cardTopOf({ top: [] })).toEqual([]);
  });
});

describe("Interviews' pictures: their addresses", () => {
  it('serves each picture under a version of what it draws', () => {
    expect(interviewsCardUrlOf(interviewsHome)).toBe(
      `/interviews/card.png?v=${interviewsCardVersionOf(interviewsHome)}`,
    );
    expect(companyCardUrlOf(northwindPage)).toBe(
      `/interviews/northwind/card.png?v=${companyCardVersionOf(northwindPage)}`,
    );
    expect(planCardUrlOf(northwindSeniorPlan)).toBe(
      `/interviews/northwind/senior-software-engineer/card.png?v=${planCardVersionOf(northwindSeniorPlan)}`,
    );
  });

  it('moves the version when what the picture draws changes, and only then', () => {
    expect(interviewsCardVersionOf(interviewsHome)).toBe(interviewsCardVersionOf({ ...interviewsHome }));
    expect(interviewsCardVersionOf({ top: [company('a')] })).not.toBe(
      interviewsCardVersionOf({ top: [company('a', false)] }),
    );
    expect(companyCardVersionOf(northwindPage)).not.toBe(
      companyCardVersionOf({ ...northwindPage, positions: northwindPage.positions.slice(1) }),
    );
    const relined = { ...northwindPage, line: 'Another line the picture does not draw.' };
    expect(companyCardVersionOf(northwindPage)).toBe(companyCardVersionOf(relined));
    expect(planCardVersionOf(northwindSeniorPlan)).not.toBe(
      planCardVersionOf({ ...northwindSeniorPlan, rounds: northwindSeniorPlan.rounds.slice(0, 4) }),
    );
    expect(planCardVersionOf(northwindSeniorPlan)).not.toBe(
      planCardVersionOf({ ...northwindSeniorPlan, company: { ...northwindSeniorPlan.company, logo: false } }),
    );
  });
});
