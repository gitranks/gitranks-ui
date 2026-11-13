import type { Route } from 'next';

import type { MyLesson, MyLessonState } from './learn.types';
import { learnAttemptPath } from './learn-path';
import type { Tone } from '@/lib/contribute/attempt-format';
import { dayLabel } from '@/lib/contribute/format';

/** Each state's pill. */
export const MY_LESSON_STATES: Record<MyLessonState, { label: string; tone: Tone }> = {
  IN_PROGRESS: { label: 'In progress', tone: 'violet' },
  PASSED: { label: 'Passed', tone: 'green' },
  PR_OPEN: { label: 'Pull request open', tone: 'green' },
  REMOVED: { label: 'Taken down', tone: 'neutral' },
  ENDED: { label: 'Ended', tone: 'neutral' },
};

/** A shared lesson's page. */
export const lessonPagePath = (slug: string) => `/learn/lessons/${encodeURIComponent(slug)}` as Route;

export type MyLessonRow = {
  key: string;
  state: MyLessonState;
  pill: { label: string; tone: Tone };
  title: string;
  /** "driftwood-js/driftwood · shared lesson". */
  meta: string | null;
  /** What happened last: "Passed Oct 28. The pull request is open…". */
  text: string;
  /** Where its button leads; null when there is nowhere to go (a lesson taken down that was not the user's). */
  href: Route | null;
  action: string;
};

/** A row of My lessons: the user's own Learn attempt leads to its page, a shared lesson they passed to the lesson. */
export function myLessonRowOf(lesson: MyLesson): MyLessonRow {
  const own = !!lesson.attemptId;
  const href = lesson.attemptId
    ? learnAttemptPath(lesson.attemptId)
    : lesson.slug && lesson.state !== 'REMOVED'
      ? lessonPagePath(lesson.slug)
      : null;
  const day = dayLabel(lesson.passedAt);
  const passed = day ? `Passed ${day}` : null;
  const text = (() => {
    switch (lesson.state) {
      case 'IN_PROGRESS':
        return own ? 'Your agent is on it, or the lesson waits for you.' : 'You started it and have not passed it yet.';
      case 'PASSED':
        return own ? `${passed ?? 'Passed'}. The pull request waits for your approval.` : (passed ?? 'Passed');
      case 'PR_OPEN':
        return `${passed ?? 'Passed'}. The pull request is open, and the lesson is public.`;
      case 'REMOVED':
        return own ? 'You took the lesson down. Its links say so.' : 'Its author took it down.';
      default:
        return own ? 'The attempt ended before a pull request.' : 'This lesson is no longer open.';
    }
  })();
  const action =
    lesson.state === 'IN_PROGRESS'
      ? 'Continue'
      : lesson.state === 'PASSED' && own
        ? 'Approve'
        : own
          ? 'Details'
          : 'See the lesson';
  return {
    key: lesson.attemptId ?? lesson.slug ?? lesson.title,
    state: lesson.state,
    pill: MY_LESSON_STATES[lesson.state] ?? MY_LESSON_STATES.ENDED,
    title: lesson.title.trim() || 'A lesson',
    meta: [lesson.repo, own ? null : 'shared lesson'].filter(Boolean).join(' · ') || null,
    text,
    href,
    action,
  };
}

/**
 * My lessons in two lists: what needs the user or is still going (in progress, or passed with the pull request waiting
 * for approval), and the rest, each in the API's order.
 */
export function myLessonGroupsOf(lessons: readonly MyLesson[]): { going: MyLessonRow[]; done: MyLessonRow[] } {
  const going: MyLessonRow[] = [];
  const done: MyLessonRow[] = [];
  for (const lesson of lessons) {
    const row = myLessonRowOf(lesson);
    const open = lesson.state === 'IN_PROGRESS' || (lesson.state === 'PASSED' && !!lesson.attemptId);
    (open ? going : done).push(row);
  }
  return { going, done };
}
