import type { Route } from 'next';

import { lowerFirst } from './home-search';
import { interviewLessonPath, interviewPlanPath } from './paths';
import type {
  InterviewCompanyCard,
  InterviewPlanCard,
  InterviewPlanRow,
  InterviewRoundState,
  InterviewsMyHome,
} from './types';

/*
 * Interviews home: one address, two pages. The landing, for a visitor and for a person with no plan in progress; and
 * the person's own home once they have one: one box for the plan to go on with, the other plans as rows, then the
 * companies with the search. What each says is worked out here, so the pages only draw it.
 */

/** What the home is: the landing, or the person's home with the plan to go on with first. */
export type InterviewsHomeView =
  | { kind: 'landing' }
  | { kind: 'mine'; first: InterviewPlanRow; others: InterviewPlanRow[]; companies: ReadonlySet<string> };

/** The landing, as the server draws it and as a visitor keeps it. */
export const LANDING_HOME_VIEW: InterviewsHomeView = { kind: 'landing' };

const isRow = (row: unknown): row is InterviewPlanRow => {
  const value = row as InterviewPlanRow | null;
  return !!value?.plan?.company?.slug && !!value.plan.slug && Array.isArray(value.rounds);
};

/**
 * The home for what the person's read answered: their home when they have a plan in progress (the one worked on last
 * first), the landing otherwise, for no read, a failed one or one of another shape. `companies`: the companies their
 * plans in progress prepare for, which carry "Your plan".
 */
export function interviewsHomeViewOf(mine: InterviewsMyHome | null | undefined): InterviewsHomeView {
  const plans = Array.isArray(mine?.plans) ? mine.plans.filter(isRow).filter((row) => row.state === 'in_progress') : [];
  if (!plans.length) return LANDING_HOME_VIEW;
  const [first, ...others] = plans;
  return { kind: 'mine', first, others, companies: new Set(plans.map((row) => row.plan.company.slug)) };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "A, B and C". */
export function andListOf(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** A company card's positions in one line: "Software engineer, site reliability engineer, engineering manager". */
export function positionsLineOf(card: InterviewCompanyCard): string {
  return card.positions.map((position, index) => (index ? lowerFirst(position.name) : position.name)).join(', ');
}

/** How many plans a company card has: "7 plans", "1 plan"; empty for none, so no zero is drawn. */
export function plansCountOf(card: InterviewCompanyCard): string {
  return card.plans.length ? count(card.plans.length, 'plan', 'plans') : '';
}

/**
 * A plan's name as a row names it, after its company: the plan's one name, "all levels" when the position has one
 * plan for every level, and, with `levelNames`, the company's own names for its levels ("N2 and N3").
 */
export function planRowNameOf(plan: InterviewPlanCard, { levelNames = false } = {}): string {
  const parts = [plan.name];
  if (plan.slug === plan.position.slug) parts.push('all levels');
  if (levelNames && plan.levelNames.length) parts.push(andListOf(plan.levelNames));
  return parts.join(', ');
}

/** A plan's size: "5 rounds · 57 lessons · 1 project", each part left out at zero. */
export function planSizeOf(plan: InterviewPlanCard): string {
  return [
    plan.roundCount ? count(plan.roundCount, 'round', 'rounds') : '',
    plan.lessons ? count(plan.lessons, 'lesson', 'lessons') : '',
    plan.projects ? count(plan.projects, 'project', 'projects') : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "round 3 of 5"; empty when the read names no round. */
export function roundOfLine(row: InterviewPlanRow): string {
  return row.here && row.plan.roundCount ? `round ${row.here} of ${row.plan.roundCount}` : '';
}

/** What the box of the plan to go on with says and links to. */
export type PlanBox = {
  /** "Northwind · Senior software engineer". */
  title: string;
  round: string;
  /** "Round 2 is done." when the person just finished one; empty otherwise. */
  done: string;
  /** The next thing: its name, how many lessons ("11 lessons", empty at zero) and where it opens. None when unknown. */
  next: { name: string; lessons: string; href: Route } | null;
  plan: Route;
};

/** The box of the plan to go on with. */
export function planBoxOf(row: InterviewPlanRow): PlanBox {
  const { company, slug } = row.plan;
  const plan = interviewPlanPath(company.slug, slug);
  const next = row.next
    ? {
        name: row.next.itemName,
        lessons: row.next.lessons ? count(row.next.lessons, 'lesson', 'lessons') : '',
        href: row.next.lesson ? interviewLessonPath(row.next.lesson, company.slug, slug) : plan,
      }
    : null;
  return {
    title: `${company.name} · ${row.plan.name}`,
    round: roundOfLine(row),
    done: row.justDone ? `Round ${row.justDone} is done.` : '',
    next,
    plan,
  };
}

/** How a round looks as a mark: done, the one the person is in, to come, or one with nothing to prepare. */
export const ROUND_MARK_LOOK: Record<InterviewRoundState, string> = {
  done: 'bg-brand-soft-foreground',
  started: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground)]',
  to_come: 'bg-muted shadow-[inset_0_0_0_1px_var(--border)]',
  none: 'border border-dashed border-border',
};

/** The words of each step of how it works. */
export const HOME_STEPS: { title: string; text: string }[] = [
  {
    title: 'Pick a company and a position',
    text: 'Each plan is one real interview: its rounds, how long they take and what they check.',
  },
  {
    title: 'Prepare round by round',
    text: 'Short lessons with one question each, and small projects you build with your own agent.',
  },
  { title: 'Go in any order', text: 'Nothing is locked, and what you learned before already counts.' },
];

/** The questions of the landing, each opening its answer in place. */
export const HOME_QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'Is a plan official?',
    answer:
      'No. No company takes part in these pages. A plan is written from what a company publishes about its interviews and what candidates report in public, and each page shows the day its facts were last checked.',
  },
  {
    question: 'How do you know what a company asks?',
    answer:
      'We read the company’s own pages and what candidates report in public. A fact from candidates is used only when at least two reports from different places say it. Every fact says who states it and opens its sources.',
  },
  {
    question: 'Does anyone see which interview I prepare for?',
    answer: 'No. Your interview plans are not publicly visible. They are not on your profile or your Skills page.',
  },
  { question: 'What does it cost?', answer: 'Nothing. The plans and their lessons are free.' },
  {
    question: 'Why is my company not here?',
    answer:
      'A company gets its plans when public sources describe its interviews well enough. More companies come as they do.',
  },
];

const NUMBER_WORDS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
];

/**
 * The line under "Companies" on the landing: "Ten to start with. More come ...", the number as a word; past twelve
 * companies, the second sentence alone.
 */
export function companiesLineOf(companies: number): string {
  const more = 'More come when public sources describe a company’s interviews well enough.';
  if (!companies || companies > NUMBER_WORDS.length) return more;
  return `${NUMBER_WORDS[companies - 1]} to start with. ${more}`;
}
