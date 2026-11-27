import { dayWordsOf } from './sources';
import type {
  InterviewAi,
  InterviewFact,
  InterviewItem,
  InterviewItemMine,
  InterviewPlanCard,
  InterviewPlanMine,
  InterviewPlanPage,
  InterviewRound,
  InterviewSource,
} from './types';

/*
 * A plan's page, as the approved designs draw it: the words of its facts, the size each round is drawn at, and the
 * state of the box "what to do now". Pure: the page and its specs read the same answers.
 */

/* The words of a plan's facts. */

/** A range as the research writes it, `"2-3"` or `"45"`: its two ends, the same number twice for one value. */
function rangeOf(value: string | null): [number, number] | null {
  const match = value ? /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(value) : null;
  if (!match) return null;
  const low = Number(match[1]);
  const high = match[2] === undefined ? low : Number(match[2]);
  return high >= low ? [low, high] : null;
}

/** "1 round", "2 or 3 rounds", "1 to 3 rounds", and "Up to 1 round" for a count from zero (never a zero). */
export function roundCountWordsOf(count: string | null): string | null {
  const range = rangeOf(count);
  if (!range) return null;
  const [low, high] = range;
  const noun = high === 1 ? 'round' : 'rounds';
  if (high === 0) return null;
  if (low === 0) return `Up to ${high} ${noun}`;
  if (low === high) return `${low} ${noun}`;
  return `${low} ${high === low + 1 ? 'or' : 'to'} ${high} ${noun}`;
}

/** "45 minutes", "45 to 60 minutes", with "each" when there may be more than one round. */
export function minutesWordsOf(minutes: string | null, count: string | null): string | null {
  const range = rangeOf(minutes);
  if (!range || range[1] === 0) return null;
  const [low, high] = range;
  const each = (rangeOf(count)?.[1] ?? 1) > 1 ? ' each' : '';
  return `${low === high || low === 0 ? high : `${low} to ${high}`} minutes${each}`;
}

/** How many and how long, on one line: "2 or 3 rounds, 45 to 60 minutes each"; null when the sources say neither. */
export function roundSizeWordsOf(round: Pick<InterviewRound, 'count' | 'minutes'>): string | null {
  const parts = [roundCountWordsOf(round.count), minutesWordsOf(round.minutes, round.count)].filter(Boolean);
  if (!parts.length) return null;
  const line = parts.join(', ');
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** The rule on help from AI in a round, in words. */
const AI_WORDS: Record<InterviewAi, string> = {
  banned: 'Not allowed.',
  allowed: 'Allowed.',
  expected: 'Expected: you work with AI help in this round.',
};

export const aiWordsOf = (ai: InterviewAi | null): string | null => (ai ? (AI_WORDS[ai] ?? null) : null);

/** A count with its noun: "1 lesson", "65 lessons"; null for none, so a zero is never drawn. */
export function countWordsOf(count: number, one: string, many: string): string | null {
  return count > 0 ? `${count} ${count === 1 ? one : many}` : null;
}

/** The plan is for every level of its position: its sources do not tell the levels apart. */
export const forAllLevels = (plan: Pick<InterviewPlanCard, 'slug' | 'position'>): boolean =>
  plan.slug === plan.position.slug;

/** "Level N3", "Levels N2 and N3", "All levels"; null when the company names no level. */
export function levelWordsOf(plan: Pick<InterviewPlanCard, 'slug' | 'position' | 'levelNames'>): string | null {
  if (forAllLevels(plan)) return 'All levels';
  const names = plan.levelNames.filter((name) => name.trim());
  if (!names.length) return null;
  return `${names.length === 1 ? 'Level' : 'Levels'} ${andList(names)}`;
}

/** Names joined as a sentence says them: "A", "A and B", "A, B and C". */
export function andList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "65 lessons", "65 lessons and 3 projects"; null with neither. */
export function planLessonsWordsOf(plan: Pick<InterviewPlanCard, 'lessons' | 'projects'>): string | null {
  const parts = [countWordsOf(plan.lessons, 'lesson', 'lessons'), countWordsOf(plan.projects, 'project', 'projects')];
  const words = parts.filter((part): part is string => !!part);
  return words.length ? words.join(' and ') : null;
}

/** How long the whole process takes, as the head says it: "4 to 8 weeks from the first call to the offer". */
export const timelineWordsOf = (timeline: InterviewFact | null): string | null =>
  timeline?.value?.trim() ? `${timeline.value.trim()} from the first call to the offer` : null;

/** The facts under a plan's name: its level, its rounds, its lessons, and how long it takes. */
export function planFactsOf(plan: InterviewPlanPage): string[] {
  return [
    levelWordsOf(plan),
    plan.roundCount > 0 ? `${plan.roundCount} ${plan.roundCount === 1 ? 'round' : 'rounds'} to prepare` : null,
    planLessonsWordsOf(plan),
    timelineWordsOf(plan.timeline),
  ].filter((fact): fact is string => !!fact);
}

/** The notice under a plan's facts: not an official page, the day of the last check, and "All levels" explained. */
export function planNoticeOf(plan: InterviewPlanPage): string {
  const checked = dayWordsOf(plan.checkedAt);
  return [
    `Not an official ${plan.company.name} page.`,
    checked ? `Built from public sources, last checked ${checked}.` : 'Built from public sources.',
    forAllLevels(plan) ? 'Sources do not tell the levels apart.' : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/** "5 rounds · 65 lessons", the box's words on its right. */
export function planSizeWordsOf(plan: Pick<InterviewPlanCard, 'roundCount' | 'lessons' | 'projects'>): string {
  return [
    countWordsOf(plan.roundCount, 'round', 'rounds'),
    countWordsOf(plan.lessons, 'lesson', 'lessons'),
    countWordsOf(plan.projects, 'project', 'projects'),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** A fact as one line: its value and its note, each a sentence. */
export function factTextOf(fact: Pick<InterviewFact, 'value' | 'note'>): string {
  return [fact.value, fact.note]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(' ');
}

/** What a source is, counted, as the line on a thin round says it. */
const KIND_COUNT_WORDS: Record<InterviewSource['kind'], [string, string]> = {
  official: ['page of the company', 'pages of the company'],
  handbook: ['handbook', 'handbooks'],
  candidate_report: ['report', 'reports'],
  guide: ['guide', 'guides'],
  news: ['news story', 'news stories'],
  listing: ['job listing', 'job listings'],
};

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const numberWordOf = (count: number) => NUMBER_WORDS[count] ?? String(count);

/**
 * The line of a round that rests on fewer sources than a fact needs, written from its own sources: "Thin: this round
 * rests on one guide and one report." With no source it says so plainly.
 */
export function thinWordsOf(round: Pick<InterviewRound, 'sources'>, sources: readonly InterviewSource[]): string {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const counts = new Map<InterviewSource['kind'], number>();
  for (const id of new Set(round.sources)) {
    const kind = byId.get(id)?.kind;
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const parts = [...counts].map(([kind, count]) => {
    const [one, many] = KIND_COUNT_WORDS[kind] ?? ['source', 'sources'];
    return `${numberWordOf(count)} ${count === 1 ? one : many}`;
  });
  return parts.length ? `Thin: this round rests on ${andList(parts)}.` : 'Thin: this round rests on few sources.';
}

/* Where the person stands. */

/** An item's lessons for the person, by the item's key. */
export const itemsMineOf = (mine: Pick<InterviewPlanMine, 'rounds'> | null): Map<string, InterviewItemMine> =>
  new Map((mine?.rounds ?? []).flatMap((round) => round.items.map((item) => [item.key, item] as const)));

/** The person's round by its number. */
export const roundMineOf = (mine: Pick<InterviewPlanMine, 'rounds'> | null, number: number) =>
  mine?.rounds.find((round) => round.number === number) ?? null;

/** How many lessons the person learned of a plan, or of some of its rounds. */
export function lessonsLearnedOf(mine: Pick<InterviewPlanMine, 'rounds'> | null, numbers?: readonly number[]): number {
  return (mine?.rounds ?? [])
    .filter((round) => !numbers || numbers.includes(round.number))
    .reduce((sum, round) => sum + round.items.reduce((items, item) => items + item.done, 0), 0);
}

/** How many lessons a round's items hold. */
export const roundLessonsOf = (round: Pick<InterviewRound, 'items'>): number =>
  round.items.reduce((sum, item) => sum + (item.type === 'lessons' ? item.lessons : 0), 0);

/**
 * The size a round is drawn at: `facts`, a round with nothing to do (it never opens); `row`, a finished round in one
 * row; `open`, the round "You are here" points to, with a row for each item; `closed`, a round to come in two lines
 * that open in place.
 */
export type RoundSize = 'facts' | 'row' | 'open' | 'closed';

export function roundSizeOf(
  round: Pick<InterviewRound, 'number' | 'items'>,
  mine: Pick<InterviewPlanMine, 'rounds' | 'here'> | null,
): RoundSize {
  if (!round.items.length) return 'facts';
  if (roundMineOf(mine, round.number)?.state === 'done') return 'row';
  if (mine?.here === round.number) return 'open';
  return 'closed';
}

/** What an item's row says on its right, for the person. */
export type ItemStanding =
  | { kind: 'to_come'; words: string | null }
  | { kind: 'started'; words: string }
  | { kind: 'done'; words: string | null };

export function itemStandingOf(item: InterviewItem, mine: InterviewItemMine | undefined): ItemStanding {
  const lessons = item.type === 'lessons' ? item.lessons : 0;
  if (mine && mine.of > 0 && mine.done >= mine.of) {
    return { kind: 'done', words: countWordsOf(mine.of, 'lesson learned', 'lessons learned') };
  }
  if (mine && mine.done > 0) return { kind: 'started', words: `${mine.done} of ${mine.of} learned` };
  return { kind: 'to_come', words: countWordsOf(lessons, 'lesson', 'lessons') };
}

/** An item's name first and its course second: "Graphs", "Algorithms and data structures". */
export function itemNamesOf(item: InterviewItem): { name: string; from: string } {
  return item.type === 'lessons'
    ? { name: item.group.name, from: item.course.name }
    : { name: item.project.name, from: 'a project, with your agent' };
}

/** The items a round lists on its closed card: "Learn: Graphs, Dynamic programming". */
export const learnLineOf = (round: Pick<InterviewRound, 'items'>): string =>
  round.items
    .filter((item) => item.type === 'lessons')
    .map((item) => itemNamesOf(item).name)
    .join(', ');

/** A round's progress on its head, once started out of order: "8 of 16 lessons learned". */
export function roundProgressWordsOf(
  round: InterviewRound,
  mine: Pick<InterviewPlanMine, 'rounds'> | null,
): string | null {
  const own = roundMineOf(mine, round.number);
  if (own?.state !== 'started') return null;
  const done = own.items.reduce((sum, item) => sum + item.done, 0);
  const of = own.items.reduce((sum, item) => sum + item.of, 0);
  return done > 0 && of > 0 ? `${done} of ${of} lessons learned` : null;
}

/** Whether the person went ahead of "You are here": a later round started or done. */
export const jumpedAheadOf = (mine: Pick<InterviewPlanMine, 'rounds' | 'here'> | null): boolean =>
  !!mine &&
  mine.here !== null &&
  mine.rounds.some((round) => round.number > (mine.here ?? 0) && (round.state === 'done' || round.state === 'started'));

/* The box "what to do now". */

/** The next thing, as the box names it: the item, its round, its first lesson to open, and whether it was started. */
export type BoxNext = {
  round: InterviewRound;
  item: InterviewItem;
  lesson: string;
  started: boolean;
  lessons: number;
};

/**
 * The box's state. `visitor`: no session (sign in to start). `start`: signed in, the plan not started or stopped
 * before (`learnedBefore`: the plan's lessons learned already). `progress`: in progress, with the next thing. `round`:
 * a round just finished (`done`), the next round to start. `finished`: every round done. `stopped`: right after
 * stopping, in place.
 */
export type PlanBox =
  | { kind: 'visitor' }
  | { kind: 'start'; learnedBefore: number }
  | {
      kind: 'progress';
      here: number;
      next: BoxNext | null;
      startedAt: string | null;
      learned: number;
      learnedBefore: number;
    }
  | { kind: 'round'; done: InterviewRound; here: number; next: BoxNext | null }
  | { kind: 'finished'; startedAt: string | null; finishedAt: string | null; learned: number; reviewDue: boolean }
  | { kind: 'stopped'; stoppedAt: string | null; learned: number };

/** The next thing the person's read names, looked up in the plan. */
export function boxNextOf(plan: InterviewPlanPage, mine: InterviewPlanMine): BoxNext | null {
  if (!mine.next) return null;
  const round = plan.rounds.find((one) => one.key === mine.next?.round);
  const item = round?.items.find((one) => one.key === mine.next?.item);
  if (!round || !item || item.type !== 'lessons') return null;
  const own = itemsMineOf(mine).get(item.key);
  return {
    round,
    item,
    lesson: mine.next.lesson ?? own?.next ?? item.first,
    started: (own?.done ?? 0) > 0,
    lessons: item.lessons,
  };
}

/**
 * The box for the person: `mine` is their read (none for a visitor, or when the read failed: then a session sees the
 * start box). `stoppedNow`: the person stopped the plan on this page a moment ago.
 */
export function planBoxOf(
  plan: InterviewPlanPage,
  mine: InterviewPlanMine | null,
  { session, stoppedNow = false }: { session: boolean; stoppedNow?: boolean },
): PlanBox {
  if (!session) return { kind: 'visitor' };
  if (!mine) return { kind: 'start', learnedBefore: 0 };
  const learned = lessonsLearnedOf(mine);
  if (mine.state === 'stopped' && stoppedNow) return { kind: 'stopped', stoppedAt: mine.stoppedAt, learned };
  if (mine.state === 'finished') {
    return {
      kind: 'finished',
      startedAt: mine.startedAt,
      finishedAt: mine.finishedAt,
      learned,
      reviewDue: mine.reviewDue,
    };
  }
  if (mine.state !== 'in_progress' || mine.here === null) {
    return { kind: 'start', learnedBefore: mine.state === 'none' ? mine.learnedBefore : learned };
  }
  const next = boxNextOf(plan, mine);
  const done = mine.justDone === null ? null : plan.rounds.find((round) => round.number === mine.justDone);
  if (done) return { kind: 'round', done, here: mine.here, next };
  return {
    kind: 'progress',
    here: mine.here,
    next,
    startedAt: mine.startedAt,
    learned,
    learnedBefore: mine.learnedBefore,
  };
}

/** Each round as the box's marks: done, the round "You are here" points to, or ahead. */
export type BoxMark = 'done' | 'here' | 'ahead';

export function boxMarksOf(plan: InterviewPlanPage, mine: InterviewPlanMine | null): BoxMark[] {
  return plan.rounds.map((round) => {
    const own = roundMineOf(mine, round.number);
    if (own?.state === 'done' || (mine?.state === 'finished' && round.items.length)) return 'done';
    if (mine?.here === round.number) return 'here';
    return 'ahead';
  });
}

/* Days, as the box says them, in the browser's own time zone (or the one given). */

const dayKeyOf = (date: Date, zone?: string) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone }).format(date);

/** "24 Nov"; null for a value that is not a time. */
export function shortDayOf(iso: string | null, zone?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: zone }).format(date);
}

/** "started today", "started 24 Nov"; null with no day. */
export function startedWordsOf(iso: string | null, now: Date, zone?: string): string | null {
  const day = shortDayOf(iso, zone);
  if (!day || !iso) return null;
  return dayKeyOf(new Date(iso), zone) === dayKeyOf(now, zone) ? 'started today' : `started ${day}`;
}

/** Whether the plan was started on the day `now` falls on. */
export const startedTodayOf = (iso: string | null, now: Date, zone?: string): boolean =>
  !!iso && !Number.isNaN(new Date(iso).getTime()) && dayKeyOf(new Date(iso), zone) === dayKeyOf(now, zone);

/** "2 Nov to 26 Nov"; one day alone when both are the same, null with neither. */
export function daysWordsOf(from: string | null, to: string | null, zone?: string): string | null {
  const start = shortDayOf(from, zone);
  const end = shortDayOf(to, zone);
  if (start && end) return start === end ? end : `${start} to ${end}`;
  return end ?? start;
}

/** Why a person stops a plan, as the question lists them. */
export const STOP_REASON_WORDS = {
  only_looking: 'I was only looking',
  interview_over: 'My interview is over',
  another_plan: 'I chose another plan',
  does_not_fit: 'This plan does not fit me',
  something_else: 'Something else',
} as const;
