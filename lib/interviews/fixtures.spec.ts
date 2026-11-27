import { describe, expect, it } from 'vitest';

import {
  interviewsHome,
  northwind,
  northwindPage,
  northwindPlanCards,
  northwindSeniorSoftwareEngineerCard,
  northwindSources,
  tallgrass,
  tallgrassPage,
  tallgrassSources,
  tallgrassSreCard,
} from './__fixtures__/companies';
import { mineFull, myHomeTwo, seniorInProgress, seniorRoundDone, tallgrassStarted } from './__fixtures__/mine';
import { northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import { isInterviewCompanySlug, isInterviewPlanSlug } from './paths';
import type { InterviewFact, InterviewPlanPage, InterviewSource } from './types';

/* The fixtures the pages are built and tested on agree with each other and with the rules, as the API's answers do. */

const lessonsOf = (plan: InterviewPlanPage) =>
  plan.rounds
    .flatMap((round) => round.items)
    .reduce((sum, item) => sum + (item.type === 'lessons' ? item.lessons : 0), 0);

const idsOf = (sources: readonly InterviewSource[]) => new Set(sources.map((source) => source.id));

const factsOf = (plan: InterviewPlanPage): { sources: string[] }[] => [
  ...plan.rounds,
  ...plan.after,
  ...(plan.timeline ? [plan.timeline] : []),
];

describe("Interviews' fixtures", () => {
  it('use two made-up companies, on made-up sites only', () => {
    expect([northwind.name, tallgrass.name]).toEqual(['Northwind', 'Tallgrass']);
    for (const source of [...northwindSources, ...tallgrassSources]) {
      expect(new URL(source.url).hostname.endsWith('.example')).toBe(true);
      expect(source.site.endsWith('.example')).toBe(true);
    }
    expect(northwindPage.githubOrg).not.toMatch(/\.(com|org|io)$/);
  });

  it('use only slugs a company or a plan can have', () => {
    for (const company of [northwind, tallgrass]) expect(isInterviewCompanySlug(company.slug)).toBe(true);
    for (const card of [...northwindPlanCards, tallgrassSreCard]) expect(isInterviewPlanSlug(card.slug)).toBe(true);
    expect(new Set(northwindPlanCards.map((card) => card.slug)).size).toBe(northwindPlanCards.length);
  });

  it('give each plan as many rounds and lessons as its card says', () => {
    expect(northwindSeniorPlan.rounds).toHaveLength(northwindSeniorSoftwareEngineerCard.roundCount);
    expect(lessonsOf(northwindSeniorPlan)).toBe(northwindSeniorSoftwareEngineerCard.lessons);
    expect(tallgrassSrePlan.rounds).toHaveLength(tallgrassSreCard.roundCount);
    expect(lessonsOf(tallgrassSrePlan)).toBe(tallgrassSreCard.lessons);
    for (const plan of [northwindSeniorPlan, tallgrassSrePlan]) {
      expect(plan.rounds.map((round) => round.number)).toEqual(plan.rounds.map((_, index) => index + 1));
    }
  });

  it('name only sources the page holds', () => {
    for (const plan of [northwindSeniorPlan, tallgrassSrePlan]) {
      const ids = idsOf(plan.sources);
      for (const fact of factsOf(plan)) for (const id of fact.sources) expect(ids.has(id)).toBe(true);
    }
    for (const page of [northwindPage, tallgrassPage]) {
      const ids = idsOf(page.sources);
      const facts: InterviewFact[] = [...page.process, ...page.values, ...(page.timeline ? [page.timeline] : [])];
      for (const fact of facts) for (const id of fact.sources) expect(ids.has(id)).toBe(true);
      expect(page.official.every((source) => source.kind === 'official')).toBe(true);
    }
  });

  it('cover the cases the pages draw: a thin round, a round with nothing to prepare with, nothing after the rounds', () => {
    expect(northwindSeniorPlan.rounds.some((round) => round.thin)).toBe(true);
    expect(tallgrassSrePlan.rounds.some((round) => round.items.length === 0)).toBe(true);
    expect(tallgrassSrePlan.after).toEqual([]);
    expect(tallgrassSrePlan.timeline).toBeNull();
    expect(tallgrassPage.course).toBeNull();
    expect(northwindSources.some((source) => source.how === 'search_summary')).toBe(true);
    expect(northwindSources.some((source) => !source.title && !source.published)).toBe(true);
  });

  it("list both companies on Interviews home, and the person's plans of both", () => {
    expect(interviewsHome.companies.map((card) => card.company.slug)).toEqual(['northwind', 'tallgrass']);
    expect(myHomeTwo.plans.map((row) => row.plan.company.slug)).toEqual(['northwind', 'tallgrass']);
    expect(mineFull.inProgress.length).toBeGreaterThan(0);
    expect(mineFull.finished.length).toBeGreaterThan(0);
  });

  it("give the person's side the same rounds as the plan, in order", () => {
    for (const [mine, plan] of [
      [seniorInProgress, northwindSeniorPlan],
      [seniorRoundDone, northwindSeniorPlan],
      [tallgrassStarted, tallgrassSrePlan],
    ] as const) {
      expect(mine.rounds.map((round) => round.key)).toEqual(plan.rounds.map((round) => round.key));
    }
  });
});
