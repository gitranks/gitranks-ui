import { planRowNameOf } from './home';
import {
  INTERVIEWS_HOME_PATH,
  INTERVIEWS_MINE_PATH,
  INTERVIEWS_RESEARCH_PATH,
  interviewCompanyPath,
  interviewLessonPath,
  interviewPlanPath,
} from './paths';
import { dayWordsOf } from './sources';
import type {
  InterviewBasis,
  InterviewCompanyRef,
  InterviewPlanRow,
  InterviewsForCourse,
  InterviewsMyHome,
} from './types';

/*
 * What Interviews says on Learn's pages, worked out here so the parts on those pages only draw it: the companies a
 * line names, the words of a lesson's sentence and of a group's "Asked at", what a company's own course adds, and the
 * row of the plan to go on with on Learn home and My progress. Pure.
 */

/** How many companies a sentence names before "and N more", and how many logos "Asked at" draws. */
export const COMPANIES_NAMED = 3;

/** The companies a sentence names: the first three by name and how many more, or every one by name when `all`. */
export function namedCompaniesOf<T>(companies: readonly T[], all = false): { named: T[]; more: number } {
  if (all || companies.length <= COMPANIES_NAMED) return { named: [...companies], more: 0 };
  return { named: companies.slice(0, COMPANIES_NAMED), more: companies.length - COMPANIES_NAMED };
}

/**
 * A lesson's sentence about its group's topic: "Candidates report graphs in interviews at …" when any company's
 * basis is a report, "… list graphs among their interview topics" when every one is the company's own pages. The
 * words before and after the companies; null with no company or no topic.
 */
export type TopicSentence = { before: string; after: string };

export function topicSentenceOf(entry: {
  topic: string;
  companies: readonly unknown[];
  basis: InterviewBasis;
}): TopicSentence | null {
  const topic = entry.topic.trim();
  if (!topic || !entry.companies.length) return null;
  if (entry.basis !== 'official') return { before: `Candidates report ${topic} in interviews at `, after: '.' };
  // One company named alone takes the verb of one; "Northwind and 4 more" are many.
  return entry.companies.length === 1
    ? { before: '', after: ` lists ${topic} among its interview topics.` }
    : { before: '', after: ` list ${topic} among their interview topics.` };
}

/** "Asked at" on a group's line: up to three logos, how many more ("+4", none at zero), and every name for pointing. */
export type AskedAt<T> = { logos: T[]; more: string; names: string; title: string };

export function askedAtOf<T extends { name: string }>(entry: {
  companies: readonly T[];
  basis: InterviewBasis;
}): AskedAt<T> | null {
  if (!entry.companies.length) return null;
  const { named, more } = namedCompaniesOf(entry.companies);
  const names = entry.companies.map((company) => company.name).join(', ');
  const one = entry.companies.length === 1;
  const title =
    entry.basis === 'official'
      ? `${names} ${one ? 'lists it among its' : 'list it among their'} interview topics`
      : `Candidates report it at ${names}`;
  return { logos: named, more: more > 0 ? `+${more}` : '', names, title };
}

/** Where "Asked at" leads: the company's page when one company asks it, Interviews home when several do. */
export const askedAtHrefOf = (companies: readonly { slug: string }[]) =>
  companies.length === 1 ? interviewCompanyPath(companies[0].slug) : INTERVIEWS_HOME_PATH;

/**
 * Learn's view of one course's answer: what the course page and its lessons draw, with the hrefs and the day words a
 * company's own course needs. Null when it says nothing (no company, no group asked, not a company's course).
 */
export function courseInterviewsOf(answer: InterviewsForCourse | null | undefined) {
  if (!answer || typeof answer !== 'object') return null;
  const companies = Array.isArray(answer.companies) ? answer.companies : [];
  const groups = (Array.isArray(answer.groups) ? answer.groups : []).filter(
    (entry) => Array.isArray(entry?.companies) && entry.companies.length > 0 && typeof entry.topic === 'string',
  );
  const own = answer.own?.company?.slug
    ? {
        company: answer.own.company,
        checked: dayWordsOf(answer.own.checkedAt),
        plans: Array.isArray(answer.own.plans) ? answer.own.plans.length : 0,
        plansHref: interviewCompanyPath(answer.own.company.slug) as string,
        researchHref: INTERVIEWS_RESEARCH_PATH as string,
      }
    : null;
  if (!companies.length && !groups.length && !own) return null;
  return { companies, groups, own };
}

/** The row of the plan to go on with, on Learn home and My progress. */
export type LearnPlanRow = {
  company: InterviewCompanyRef;
  /** "Northwind · Senior software engineer". */
  title: string;
  /** "Round 3 of 5" or "Round 2 of 5 is done"; empty when the read names no round. */
  round: string;
  /** What comes next, in the row's strong words: "Graphs, 11 lessons", or the next round "System design, round 4". */
  next: string;
  /** The next thing: its first lesson inside the plan, else the plan. */
  href: string;
  /** "2 more plans", "1 more plan"; empty with one plan. */
  more: string;
  moreHref: string;
};

const roundsOf = (row: InterviewPlanRow) => row.plan.roundCount || row.rounds.length;

/**
 * The row for the person's plans in progress: the plan worked on last that has a next thing. None with no plan, and
 * when every round of every plan is done.
 */
export function learnPlanRowOf(home: InterviewsMyHome | null | undefined): LearnPlanRow | null {
  const plans = (Array.isArray(home?.plans) ? home.plans : []).filter(
    (row): row is InterviewPlanRow =>
      !!row?.plan?.company?.slug && !!row.plan.slug && Array.isArray(row.rounds) && row.state === 'in_progress',
  );
  const row = plans.find((plan) => plan.next);
  if (!row?.next) return null;
  const { company, slug } = row.plan;
  const rounds = roundsOf(row);
  const justDone = row.justDone && rounds ? row.justDone : null;
  const round = justDone
    ? `Round ${justDone} of ${rounds} is done`
    : row.here && rounds
      ? `Round ${row.here} of ${rounds}`
      : '';
  const lessons = row.next.lessons > 0 ? `${row.next.lessons} ${row.next.lessons === 1 ? 'lesson' : 'lessons'}` : '';
  const next = justDone
    ? [row.next.roundName, row.here ? `round ${row.here}` : ''].filter(Boolean).join(', ')
    : [row.next.itemName, lessons].filter(Boolean).join(', ');
  const others = plans.length - 1;
  return {
    company,
    title: `${company.name} · ${planRowNameOf(row.plan)}`,
    round,
    next,
    href: row.next.lesson
      ? interviewLessonPath(row.next.lesson, company.slug, slug)
      : interviewPlanPath(company.slug, slug),
    more: others > 0 ? `${others} more ${others === 1 ? 'plan' : 'plans'}` : '',
    moreHref: INTERVIEWS_MINE_PATH,
  };
}
