import type { Route } from 'next';

import { lessonPath } from '../learn-path';
import type {
  LearnPrLabel,
  LearnProgressCounts,
  LearnProgressLesson,
  LearnProgressLessonKind,
  LearnProgressLessons,
  LearnProgressMerged,
  LearnProgressRepos,
  LearnProgressUnfinished,
} from './progress.types';
import type { Tone } from '@/lib/workspace/attempt-format';
import { dayLabel } from '@/lib/workspace/format';
import { pullRequestPath, pullRequestWalkthroughPath, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** Your progress's four views, in the order of its tabs; the first shows when the address names none. */
export const PROGRESS_VIEWS = ['lessons', 'learned', 'repos', 'merged'] as const;
export type ProgressView = (typeof PROGRESS_VIEWS)[number];

/** Each list holds this many rows a page. */
export const LEARN_PROGRESS_PAGE = 20;

/** Each view's tab, and the count it shows. */
export const PROGRESS_TABS: Record<ProgressView, { label: string; count: keyof LearnProgressCounts }> = {
  lessons: { label: 'Lessons passed', count: 'lessonsPassed' },
  learned: { label: 'New things learned', count: 'newThings' },
  repos: { label: 'Repos helped', count: 'reposHelped' },
  merged: { label: 'Pull requests merged', count: 'prsMerged' },
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The view the address asks for (`?view=`); anything else is the first. */
export const progressViewOf = (value: string | string[] | undefined): ProgressView => {
  const view = one(value);
  return (PROGRESS_VIEWS as readonly string[]).includes(view ?? '') ? (view as ProgressView) : 'lessons';
};

/** The page the address asks for (`?page=`): a whole number from 1; anything else is 1. */
export const progressPageOf = (value: string | string[] | undefined): number => {
  const page = Number(one(value));
  return Number.isInteger(page) && page > 1 ? page : 1;
};

/** The last page of a list of `total` rows; 1 for an empty one. */
export const lastPageOf = (total: number): number => Math.max(1, Math.ceil(total / LEARN_PROGRESS_PAGE));

/** A page of one view's list: the lessons (passed, or those that taught a new thing), merged pull requests, repos. */
export type ProgressList =
  | { view: 'lessons' | 'learned'; lessons: LearnProgressLessons }
  | { view: 'merged'; merged: LearnProgressMerged }
  | { view: 'repos'; repos: LearnProgressRepos };

/** How many rows a view's list holds, every page of it. */
export const progressTotalOf = (list: ProgressList): number =>
  list.view === 'merged' ? list.merged.total : list.view === 'repos' ? list.repos.total : list.lessons.total;

/** Your progress at a view and a page: the first view and the first page leave their parameter out. */
export function progressPath({ view = 'lessons', page = 1 }: { view?: ProgressView; page?: number } = {}): Route {
  const query = new URLSearchParams();
  if (view !== 'lessons') query.set('view', view);
  if (page > 1) query.set('page', String(page));
  const text = query.toString();
  return (text ? `${WORKSPACE_PATHS.progress}?${text}` : WORKSPACE_PATHS.progress) as Route;
}

/** An own lesson's pull request as one pill: what happened to it, else where the attempt is. */
export const LEARN_PR_LABELS: Record<LearnPrLabel, { label: string; tone: Tone }> = {
  MERGED: { label: 'Merged', tone: 'violet' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  OPEN: { label: 'Open', tone: 'green' },
  OPENING: { label: 'Opening', tone: 'green' },
  READY: { label: 'Ready to submit', tone: 'amber' },
  REWRITING: { label: 'Being rewritten', tone: 'neutral' },
  ENDED: { label: 'Ended', tone: 'neutral' },
};

/** "Your lesson" (violet) or "Practice". */
export const LESSON_KINDS: Record<LearnProgressLessonKind, { label: string; tone: Tone }> = {
  OWN: { label: 'Your lesson', tone: 'violet' },
  PRACTICE: { label: 'Practice', tone: 'neutral' },
};

/** "1 new thing learned", "3 new things learned". */
export const newThingsLabel = (count: number) => `${count} new ${count === 1 ? 'thing' : 'things'} learned`;

/** "Passed Nov 12 · 3 new things learned"; no second part when the lesson taught nothing new. */
export function passedLineOf(lesson: Pick<LearnProgressLesson, 'passedAt' | 'learned'>): string {
  const day = dayLabel(lesson.passedAt);
  return [day ? `Passed ${day}` : 'Passed', lesson.learned.length ? newThingsLabel(lesson.learned.length) : null]
    .filter(Boolean)
    .join(' · ');
}

/** The issue a lesson or a pull request is on, when both its repo and its number are known. */
const refOf = (repo: string | null, issue: number | null) =>
  repo && /^[^/\s]+\/[^/\s]+$/.test(repo) && typeof issue === 'number' ? { repo, issue } : null;

/** The pull request's page of the viewer's issue; null without a repo and a number. */
export function pullRequestPageOf(repo: string | null, issue: number | null): Route | null {
  const ref = refOf(repo, issue);
  return ref ? pullRequestPath(ref) : null;
}

/** The walkthrough of the viewer's issue's pull request (its Lesson view before); null without a repo and a number. */
export function lessonViewPathOf(repo: string | null, issue: number | null): Route | null {
  const ref = refOf(repo, issue);
  return ref ? pullRequestWalkthroughPath(ref) : null;
}

/** A lesson taken down, by its author or by us: its row stays, its title leads nowhere. */
const isTakenDown = (lesson: Pick<LearnProgressLesson, 'visibility'>) =>
  lesson.visibility === 'REMOVED' || lesson.visibility === 'HIDDEN';

/** What a passed lesson's row links: its title, its button, and the note that it was taken down. */
export type ProgressLessonLinks = {
  /** The lesson: an own lesson's Lesson view, a practice lesson's page. Null once taken down. */
  lesson: Route | null;
  /** The row's button. */
  action: { href: Route; label: string } | null;
  /** "Taken down", "Its author took it down"; null while the lesson is there. */
  note: string | null;
};

export function progressLessonLinksOf(lesson: LearnProgressLesson): ProgressLessonLinks {
  const down = isTakenDown(lesson);
  if (lesson.kind === 'OWN') {
    const details = pullRequestPageOf(lesson.repo, lesson.issueNumber);
    return {
      lesson: down ? null : lessonViewPathOf(lesson.repo, lesson.issueNumber),
      action: details ? { href: details, label: 'Details' } : null,
      note: down ? 'Taken down' : null,
    };
  }
  // A practice lesson opens only while its page does: public, not held.
  const page = !down && lesson.visibility === 'PUBLIC' && lesson.slug ? lessonPath(lesson.slug) : null;
  // Its author took it down (`REMOVED`); one GitRanks hid (`HIDDEN`) is only "Taken down".
  return {
    lesson: page,
    action: page ? { href: page, label: 'See the lesson' } : null,
    note: lesson.visibility === 'REMOVED' ? 'Its author took it down' : down ? 'Taken down' : null,
  };
}

/** What a Not finished row says and links: "Started Oct 22 · 2 of 5 steps passed", Continue or Details. */
export function unfinishedRowOf(row: LearnProgressUnfinished): {
  text: string;
  href: Route | null;
  action: string;
} {
  const day = dayLabel(row.at);
  if (row.kind === 'PRACTICE') {
    const steps =
      typeof row.stepsPassed === 'number' && typeof row.steps === 'number'
        ? `${row.stepsPassed} of ${row.steps} ${row.steps === 1 ? 'step' : 'steps'} passed`
        : null;
    return {
      text: [day ? `Started ${day}` : 'Started', steps].filter(Boolean).join(' · '),
      href: row.slug ? lessonPath(row.slug) : null,
      action: 'Continue',
    };
  }
  const before = row.hasLesson ? 'before you passed the lesson' : 'before the lesson was written';
  return {
    text: `${day ? `Ended ${day}` : 'Ended'}, ${before}. No pull request.`,
    href: pullRequestPageOf(row.repo, row.issueNumber),
    action: 'Details',
  };
}

/** "2 pull requests merged · last on Nov 9". */
export function repoLineOf(repo: { merged: number; lastMergedAt: string }): string {
  const day = dayLabel(repo.lastMergedAt);
  const merged = `${repo.merged} ${repo.merged === 1 ? 'pull request' : 'pull requests'} merged`;
  return day ? `${merged} · last on ${day}` : merged;
}

/** A repository's row shows this many of its pull requests, then "and N more". */
export const REPO_PRS_SHOWN = 3;

/**
 * What Your progress' Share control says: nothing before a first pass; nothing public yet to share; public numbers
 * that are the viewer's own; or public numbers that count less (a lesson whose pull request is not open yet, a
 * practice result not shared).
 */
export type ShareState = 'nothing' | 'no-record' | 'equal' | 'differ';

const SHARED_COUNTS = ['lessonsPassed', 'newThings', 'reposHelped', 'prsMerged'] as const;

export function shareStateOf(counts: LearnProgressCounts, publicCounts: LearnProgressCounts | null): ShareState {
  if (counts.lessonsPassed === 0) return 'nothing';
  if (!publicCounts || publicCounts.lessonsPassed === 0) return 'no-record';
  return SHARED_COUNTS.every((key) => counts[key] === publicCounts[key]) ? 'equal' : 'differ';
}
