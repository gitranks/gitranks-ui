import type { LearnRecord } from '../learn.types';
import { publicProgressPath } from '../learn-path';
import type { LearnedStep, LearnProgressCounts, LearnProgressLessonKind } from '../progress/progress.types';
import { absoluteUrl } from '@/lib/seo/site';

/** A lesson on a person's public progress page: only what is public. A pull request only once it was merged. */
export type LearnPublicLesson = {
  kind: LearnProgressLessonKind;
  slug: string;
  title: string;
  repo: string | null;
  issueNumber: number | null;
  passedAt: string;
  learned: LearnedStep[];
  merged: boolean;
  prNumber: number | null;
  prUrl: string | null;
};

/** A person's public progress page: their record and a page of their public lessons, newest pass first. */
export type LearnPublicProgress = { record: LearnRecord; items: LearnPublicLesson[]; total: number };

/** The card's own address, beside a developer's other images. */
export const learnCardPath = (login: string) => `/badge/user/${encodeURIComponent(login)}/learn-card.png`;

/**
 * The numbers the card shows, as its address names them (`?v=`): a new pass or merge is a new address, so a site that
 * keeps a link preview by its image's address fetches the new card.
 */
export const learnCardVersionOf = (record: Pick<LearnRecord, 'lessons' | 'newThings' | 'reposHelped'>): string =>
  `${record.lessons}-${record.newThings}-${record.reposHelped}`;

/** The card's address for these numbers, the one address it is drawn under. */
export const learnCardUrlOf = (login: string, record: Pick<LearnRecord, 'lessons' | 'newThings' | 'reposHelped'>) =>
  `${learnCardPath(login)}?v=${learnCardVersionOf(record)}`;

/** The public page's address on the site, as Share copies it. */
export const publicProgressUrlOf = (login: string): string => absoluteUrl(publicProgressPath(login));

/** The address printed on the card: the public page's, without the scheme. */
export const learnCardAddressOf = (login: string): string => `gitranks.com/learn/progress/${login}`;

const n = (value: number) => value.toLocaleString('en-US');
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;

/**
 * The page's description, as its link preview says it: "octocat passed 7 lessons on real open-source fixes and learned
 * 19 new things. 2 repositories merged the fixes." A part at 0 is left out.
 */
export function publicProgressDescriptionOf(record: LearnRecord): string {
  const login = record.login ?? '';
  const learned = record.newThings ? ` and learned ${plural(record.newThings, 'new thing', 'new things')}` : '';
  const merged = record.reposHelped
    ? ` ${plural(record.reposHelped, 'repository', 'repositories')} merged the fixes.`
    : '';
  return `${login} passed ${plural(record.lessons, 'lesson', 'lessons')} on real open-source fixes${learned}.${merged}`;
}

/** The card's figures: lessons passed always, new things and repos helped when above 0. */
export function learnCardFiguresOf(record: LearnRecord): { value: string; label: string }[] {
  return [
    { value: n(record.lessons), label: record.lessons === 1 ? 'lesson passed' : 'lessons passed' },
    ...(record.newThings
      ? [{ value: n(record.newThings), label: record.newThings === 1 ? 'new thing learned' : 'new things learned' }]
      : []),
    ...(record.reposHelped
      ? [{ value: n(record.reposHelped), label: record.reposHelped === 1 ? 'repo helped' : 'repos helped' }]
      : []),
  ];
}

/** The page's four numbers, as the tabs of Your progress name them. */
export function publicNumbersOf(record: LearnRecord): { value: number; label: string }[] {
  return [
    { value: record.lessons, label: record.lessons === 1 ? 'lesson passed' : 'lessons passed' },
    { value: record.newThings, label: record.newThings === 1 ? 'new thing learned' : 'new things learned' },
    { value: record.reposHelped, label: record.reposHelped === 1 ? 'repo helped' : 'repos helped' },
    { value: record.prsMerged, label: record.prsMerged === 1 ? 'pull request merged' : 'pull requests merged' },
  ];
}

/**
 * What Your progress' Share control says: nothing before a first pass; no record yet (nothing public to share); a
 * record whose numbers are the viewer's own; or one that counts less (a lesson whose pull request is not open yet, a
 * practice result not shared).
 */
export type ShareState = 'nothing' | 'no-record' | 'equal' | 'differ';

const SHARED_COUNTS = ['lessonsPassed', 'newThings', 'reposHelped', 'prsMerged'] as const;

export function shareStateOf(counts: LearnProgressCounts, publicCounts: LearnProgressCounts | null): ShareState {
  if (counts.lessonsPassed === 0) return 'nothing';
  if (!publicCounts || publicCounts.lessonsPassed === 0) return 'no-record';
  return SHARED_COUNTS.every((key) => counts[key] === publicCounts[key]) ? 'equal' : 'differ';
}

/**
 * Whether a record is served under exactly the login asked: the page and the card answer under the stored spelling
 * alone (any other is a 404), so a card is kept at one address only.
 */
export const isStoredSpelling = (record: Pick<LearnRecord, 'login'>, login: string): boolean => record.login === login;
