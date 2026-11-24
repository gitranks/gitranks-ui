import type { Route } from 'next';

import { relativeLabel } from './format';
import { issueLessonPath } from './paths';

/*
 * Learn's parts on the page of one issue: the lesson the issue uses or teaches and why, whether it is kept for people
 * who are learning (no choice of how: the walkthrough is always on), and how the person's work on it started. They are
 * read in a request of their own, so the page draws what it drew without them when that read fails.
 */

/** What the lesson line says: "Uses …, which you learned", "Teaches …, which is new for you", or no line. */
export type IssueLessonWhy = 'USES_LEARNED' | 'TEACHES_NEW' | 'NO_LESSON';

/** How the person's work on the issue started, once it has. */
export type IssueStarted = {
  /** The agent by name ("Claude Code", "Your agent"); "GitRanks" for a hosted run. */
  agent: string;
  /** When it was taken (ISO). */
  at: string;
  /** With the walkthrough (a Learn fix). */
  walkthrough: boolean;
};

/** Learn's parts of the page, as the API answers them. */
export type IssuePageLearn = {
  /** The lesson the issue is linked to; null for none. */
  lesson: { slug: string; title: string } | null;
  why: IssueLessonWhy | null;
  /** Kept for people who are learning: no choice of how, the walkthrough is always on. */
  learnOnly: boolean;
  /** With the page's started state: how the work started; null before, or when it cannot be read. */
  started: IssueStarted | null;
};

const WHYS: readonly string[] = ['USES_LEARNED', 'TEACHES_NEW', 'NO_LESSON'];

/** The answer as the page uses it, or null when it is not one it can draw. */
export function issuePageLearnOf(answer: unknown): IssuePageLearn | null {
  if (!answer || typeof answer !== 'object') return null;
  const { lesson, why, learnOnly, started } = answer as Record<string, unknown>;
  const lessonOk =
    !!lesson &&
    typeof lesson === 'object' &&
    typeof (lesson as Record<string, unknown>).slug === 'string' &&
    typeof (lesson as Record<string, unknown>).title === 'string';
  const startedOk =
    !!started &&
    typeof started === 'object' &&
    typeof (started as Record<string, unknown>).agent === 'string' &&
    typeof (started as Record<string, unknown>).at === 'string' &&
    typeof (started as Record<string, unknown>).walkthrough === 'boolean';
  return {
    lesson: lessonOk ? { slug: (lesson as { slug: string }).slug, title: (lesson as { title: string }).title } : null,
    why: typeof why === 'string' && WHYS.includes(why) ? (why as IssueLessonWhy) : null,
    learnOnly: learnOnly === true,
    started: startedOk ? (started as IssueStarted) : null,
  };
}

/** The lesson line of the page: none without a lesson or a why that names one. */
export function issueLessonLineOf(
  learn: Pick<IssuePageLearn, 'lesson' | 'why'> | null,
): { title: string; href: Route; learned: boolean } | null {
  if (!learn?.lesson || !learn.why || learn.why === 'NO_LESSON') return null;
  return {
    title: learn.lesson.title,
    href: issueLessonPath(learn.lesson.slug),
    learned: learn.why === 'USES_LEARNED',
  };
}

/** The API's name for a hosted run. */
const HOSTED_AGENT = 'GitRanks';

/** "12 minutes ago"; "a moment ago" within the minute or for a time after `now`; '' for a time that is not one. */
function agoOf(iso: string, now: Date): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return '';
  const age = now.getTime() - at;
  return age < 60_000 ? 'a moment ago' : relativeLabel(iso, now);
}

/**
 * "Claude Code started it 12 minutes ago, with the walkthrough." (or "without the walkthrough"): the line of the started
 * state. A hosted run is "The hosted agent".
 */
export function startedLineOf(started: IssueStarted, now: Date): string {
  const agent = started.agent === HOSTED_AGENT ? 'The hosted agent' : started.agent.trim() || 'Your agent';
  const ago = agoOf(started.at, now);
  const how = started.walkthrough ? 'with the walkthrough' : 'without the walkthrough';
  return `${agent} started it${ago ? ` ${ago}` : ''}, ${how}.`;
}
