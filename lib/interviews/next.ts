import type { Route } from 'next';

import { interviewCompanyPath, interviewLessonPath, interviewPlanPath, interviewRoundPath } from './paths';
import {
  boxNextOf,
  countWordsOf,
  itemsMineOf,
  roundLessonsOf,
  roundMineOf,
  roundSizeWordsOf,
  shortDayOf,
} from './plan';
import { hereOf, type RoundLineMark, roundLineOf } from './round-line';
import type { InterviewItemMine, InterviewNext, InterviewPlanMine, InterviewPlanPage, InterviewRound } from './types';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/*
 * The connecting screen, after one part of a plan: one column with the same parts in every case. What was done (a
 * part, a round, the plan); where the person stands, as the rounds on one line; the next thing with its one action;
 * the way back to the plan. Every point of the line opens a small panel with that round's parts, each of which can
 * be started now. Pure: the screen and its specs read the same answers.
 */

/** What was done, as the screen's head says it. `where`: the round the person is in, said on a wide screen only. */
export type NextHead = { kind: 'part' | 'round' | 'plan'; title: string; lead: string | null; where: string | null };

/** The next thing and its one action: a part of lessons, the next round, or the end of the plan. */
export type NextThing =
  | { kind: 'lessons'; title: string; sub: string | null; label: string; href: Route; note: string | null }
  | { kind: 'round'; title: string; sub: string | null; label: string; href: Route }
  | {
      kind: 'finished';
      main: { label: string; href: Route };
      other: { label: string; href: Route };
      note: string;
    };

/** One part of a round as its panel lists it: its name, how far the person is, and where it opens. */
export type PanelPart = { key: string; name: string; words: string | null; done: boolean; href: Route };

/** A round's panel, opened from its point on the line: the round, how far the person is, its parts, its place in the plan. */
export type RoundPanel = {
  number: number;
  title: string;
  aside: string | null;
  parts: PanelPart[];
  open: Route;
};

/** A round as the phone's list of rounds shows it. */
export type PhoneRound = { number: number; title: string; words: string | null; here: boolean; open: Route };

/** The strip over the screen: the round of the part just done, its parts as squares, done or not, and the words. */
export type NextStrip = {
  round: InterviewRound | null;
  parts: boolean[];
  words: { number: number | null; tail: string };
};

/** Everything the connecting screen draws. */
export type NextScreen = {
  head: NextHead;
  strip: NextStrip;
  marks: RoundLineMark[];
  panels: RoundPanel[];
  /** The one line under the points on a phone: "Round 3 of 5", then the round's name. */
  caption: { lead: string; title: string | null };
  phone: PhoneRound[];
  next: NextThing | null;
  back: Route;
};

/** The words under a finished plan, the same as its box says. */
export const NEXT_FINISHED_NOTE =
  'A finished plan is preparation, not a promise. Your interview plans are not publicly visible.';

/** The round that holds a part, by the part's key; null when no round does. */
export const roundOfPart = (plan: Pick<InterviewPlanPage, 'rounds'>, key: string): InterviewRound | null =>
  plan.rounds.find((round) => round.items.some((item) => item.key === key)) ?? null;

/** A lesson of a part, opened inside the plan. */
const lessonHref = (plan: InterviewPlanPage, lesson: string) =>
  interviewLessonPath(lesson, plan.company.slug, plan.slug);

/** "Round 3 of 5", "Round 2", as the line's caption and the head say a round. */
const roundOfWords = (number: number, count: number) => (count > 0 ? `Round ${number} of ${count}` : `Round ${number}`);

/** The head: what was done, how much, and where the person is now. */
function headOf(plan: InterviewPlanPage, next: InterviewNext, round: InterviewRound | null): NextHead {
  const { done, mine } = next;
  const learned = countWordsOf(done.lessons, 'lesson learned', 'lessons learned');
  if (done.kind === 'plan' || mine.state === 'finished') {
    const rounds = countWordsOf(plan.roundCount, 'round', 'rounds');
    const since = shortDayOf(mine.startedAt);
    const told = [learned, since ? `since ${since}` : null].filter(Boolean).join(', ');
    return {
      kind: 'plan',
      title: `Your ${plan.company.name} interview plan`,
      lead: rounds || told ? `${[rounds, told].filter(Boolean).join(': ')}.` : null,
      where: null,
    };
  }
  if (done.kind === 'round') {
    return {
      kind: 'round',
      title: round ? `Round ${round.number}: ${round.title}` : done.name,
      lead: learned ? `${learned.charAt(0).toUpperCase()}${learned.slice(1)} in this round.` : null,
      where: null,
    };
  }
  const here = hereOf(mine);
  const hereRound = here === null ? null : plan.rounds.find((one) => one.number === here);
  return {
    kind: 'part',
    title: done.name,
    lead: learned ? `${learned.charAt(0).toUpperCase()}${learned.slice(1)}.` : null,
    where: hereRound ? `You are in round ${hereRound.number} of ${plan.roundCount}, ${hereRound.title}.` : null,
  };
}

/** The next thing: the next part's lessons, the next round when a round was just done, or the end of the plan. */
function nextThingOf(plan: InterviewPlanPage, next: InterviewNext): NextThing | null {
  const { done, mine } = next;
  if (done.kind === 'plan' || mine.state === 'finished') {
    return {
      kind: 'finished',
      main: { label: 'Fix a real issue', href: WORKSPACE_PATHS.contribute },
      other: { label: 'See other plans', href: interviewCompanyPath(plan.company.slug) },
      note: NEXT_FINISHED_NOTE,
    };
  }
  const box = boxNextOf(plan, mine);
  if (box?.item.type !== 'lessons') return null;
  const lessons = countWordsOf(box.lessons, 'lesson', 'lessons');
  const href = lessonHref(plan, box.lesson);
  if (done.kind === 'round') {
    const size = roundSizeWordsOf(box.round);
    const starts = `It starts with ${box.item.group.name}${lessons ? `, ${lessons}` : ''}.`;
    return {
      kind: 'round',
      title: `Round ${box.round.number}: ${box.round.title}`,
      sub: [size ? `${size}.` : null, starts].filter(Boolean).join(' '),
      label: `Start round ${box.round.number}`,
      href,
    };
  }
  return {
    kind: 'lessons',
    title: box.item.group.name,
    sub: lessons ? `${lessons} from ${box.item.course.name}` : `From ${box.item.course.name}`,
    label: `${box.started ? 'Continue' : 'Start'} ${box.item.group.name}`,
    href,
    note: box.started ? null : 'It opens the first lesson at once.',
  };
}

/** How far the person is in a part: "8 learned" once done, "3 of 8 learned" started, "8 lessons" to come. */
function partWordsOf(lessons: number, own: InterviewItemMine | undefined): string | null {
  if (own && own.of > 0 && own.done >= own.of) return `${own.of} learned`;
  if (own && own.done > 0) return `${own.done} of ${own.of} learned`;
  return countWordsOf(lessons, 'lesson', 'lessons');
}

/** The lessons of a round the person learned, and of all. */
function roundCountsOf(mine: InterviewPlanMine, number: number): { done: number; of: number } {
  const items = roundMineOf(mine, number)?.items ?? [];
  return {
    done: items.reduce((sum, item) => sum + item.done, 0),
    of: items.reduce((sum, item) => sum + item.of, 0),
  };
}

/** A round's panel: what was done in a finished round, the parts of any other, each of which can be started. */
function panelOf(plan: InterviewPlanPage, mine: InterviewPlanMine, round: InterviewRound): RoundPanel {
  const owns = itemsMineOf(mine);
  const state = roundMineOf(mine, round.number)?.state;
  const counts = roundCountsOf(mine, round.number);
  let aside: string | null = null;
  if (state === 'done') aside = 'done';
  else if (round.items.length && counts.done > 0) aside = `${counts.done} of ${counts.of} lessons learned`;
  else aside = countWordsOf(roundLessonsOf(round), 'lesson', 'lessons');
  const parts = round.items.flatMap((item): PanelPart[] => {
    if (item.type !== 'lessons') return [];
    const own = owns.get(item.key);
    const done = !!own && own.of > 0 && own.done >= own.of;
    return [
      {
        key: item.key,
        name: item.group.name,
        words: partWordsOf(item.lessons, own),
        done,
        href: lessonHref(plan, (!done && own?.next) || item.first),
      },
    ];
  });
  return {
    number: round.number,
    title: round.title,
    aside,
    parts,
    open: interviewRoundPath(plan.company.slug, plan.slug, round.number),
  };
}

/** A round on the phone's list: "6 learned" once done, "you are here", "8 of 16 learned" started, "8 lessons" to come. */
function phoneRoundOf(plan: InterviewPlanPage, mine: InterviewPlanMine, round: InterviewRound): PhoneRound {
  const here = hereOf(mine) === round.number;
  const state = roundMineOf(mine, round.number)?.state;
  const counts = roundCountsOf(mine, round.number);
  let words: string | null = null;
  if (!round.items.length) words = null;
  else if (state === 'done') words = countWordsOf(counts.done, 'learned', 'learned');
  else if (here) words = 'you are here';
  else if (counts.done > 0) words = `${counts.done} of ${counts.of} learned`;
  else words = countWordsOf(roundLessonsOf(round), 'lesson', 'lessons');
  return {
    number: round.number,
    title: round.title,
    words,
    here,
    open: interviewRoundPath(plan.company.slug, plan.slug, round.number),
  };
}

/** The strip's words for a round's parts: "3 of 4 parts done", "4 parts" with none done (never a zero). */
function stripWordsOf(parts: readonly boolean[]): NextStrip['words'] {
  const done = parts.filter(Boolean).length;
  const noun = parts.length === 1 ? 'part' : 'parts';
  return done > 0
    ? { number: done, tail: ` of ${parts.length} ${noun} done` }
    : { number: null, tail: `${parts.length} ${noun}` };
}

/**
 * The connecting screen for the person, after the part `after` (its key): `next` is their read. The round of that
 * part names the strip; with no round holding it, the round the person is in, else the first.
 */
export function nextScreenOf(plan: InterviewPlanPage, next: InterviewNext, after: string): NextScreen {
  const { mine } = next;
  const here = hereOf(mine);
  const round =
    roundOfPart(plan, after) ??
    (next.done.kind === 'round' ? plan.rounds.find((one) => one.title === next.done.name) : undefined) ??
    plan.rounds.find((one) => one.number === here) ??
    plan.rounds[0];
  const owns = itemsMineOf(mine);
  const parts = (round?.items ?? []).map((item) => {
    const own = owns.get(item.key);
    return !!own && own.of > 0 && own.done >= own.of;
  });
  const hereRound = here === null ? null : plan.rounds.find((one) => one.number === here);
  return {
    head: headOf(plan, next, round ?? null),
    strip: { round: round ?? null, parts, words: stripWordsOf(parts) },
    marks: roundLineOf(plan.rounds, mine, { after: false }),
    panels: plan.rounds.map((one) => panelOf(plan, mine, one)),
    caption: hereRound
      ? { lead: roundOfWords(hereRound.number, plan.roundCount), title: hereRound.title }
      : {
          lead: mine.state === 'finished' ? 'Every round done' : 'The rounds',
          title: null,
        },
    phone: plan.rounds.map((one) => phoneRoundOf(plan, mine, one)),
    next: nextThingOf(plan, next),
    back: interviewPlanPath(plan.company.slug, plan.slug),
  };
}
