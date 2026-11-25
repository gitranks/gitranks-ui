import type { IssuesList } from './issues';

/*
 * "Email me issues for my lessons": one email a day at most with new issues for the lessons a person pressed it on and
 * the lessons they learned but have not used on a real issue yet. Its button sits in the empty box of a lesson's view
 * in real projects; Settings has the same switch, its row "Issues for my lessons" (`lib/learn/settings.ts`).
 */

/** The button. */
export const LESSON_ISSUES_EMAIL_LABEL = 'Email me issues for my lessons';

/** The small line under the button, and under Settings' row. */
export const LESSON_ISSUES_EMAIL_LINE =
  'This lesson and every lesson you learned but have not used on a real issue yet. One email a day at most.';

/** The switch as a save answers it: on or off, and the lessons asked for, newest first. */
export type LearnLessonIssuesEmail = { lessonIssues: boolean; lessonIssuesAsked: string[] };

/** The save's answer when it has that shape; null for anything else. */
export function learnLessonIssuesEmailOf(value: unknown): LearnLessonIssuesEmail | null {
  if (!value || typeof value !== 'object') return null;
  const { lessonIssues, lessonIssuesAsked } = value as { lessonIssues?: unknown; lessonIssuesAsked?: unknown };
  if (typeof lessonIssues !== 'boolean') return null;
  const asked = Array.isArray(lessonIssuesAsked)
    ? lessonIssuesAsked.filter((slug): slug is string => typeof slug === 'string')
    : [];
  return { lessonIssues, lessonIssuesAsked: asked };
}

/**
 * What the box of a lesson's view shows in the button's place, which never moves:
 * - `visitor`: the button; a press signs in through Learn's onboarding and comes back to the view;
 * - `setup`: signed in without the Learn sign: the button opens Learn's onboarding, and comes back to the view;
 * - `unread`: the person's own read has not answered yet: the button, which waits;
 * - `off`: the button; a press turns the switch on and adds this lesson;
 * - `on`: the line that says where the email goes, with "Turn off";
 * - `no-address`: on, but there is no address: the line that says the email needs one, with "Turn off".
 * Nothing is turned on without the person's own press while signed in.
 */
export type LessonIssuesEmailState =
  | { kind: 'visitor' }
  | { kind: 'setup' }
  | { kind: 'unread' }
  | { kind: 'off' }
  | { kind: 'on'; to: string }
  | { kind: 'no-address' };

/**
 * The box's state from what the page read: whether the person is signed in, their list (null while it is read) and
 * the Learn sign (null when it cannot be read, which never sends anyone to the onboarding). The box says "on" only
 * when the switch is on and the email covers this lesson, so it never says "on" for a lesson the email skips.
 */
export function lessonIssuesEmailStateOf({
  signedIn,
  list,
  sign,
}: {
  signedIn: boolean;
  list: Pick<IssuesList, 'emailTo' | 'lessonIssues' | 'lessonIssuesCovered'> | null;
  sign: boolean | null;
}): LessonIssuesEmailState {
  if (!signedIn) return { kind: 'visitor' };
  if (!list) return { kind: 'unread' };
  if (list.lessonIssues === true && list.lessonIssuesCovered === true) {
    return list.emailTo ? { kind: 'on', to: list.emailTo } : { kind: 'no-address' };
  }
  return sign === false ? { kind: 'setup' } : { kind: 'off' };
}

/**
 * The person's list once a save answered: the switch as saved; this lesson covered once it is on with the lesson in
 * the list asked for, and as it was otherwise.
 */
export function listAfterLessonSave<T extends Pick<IssuesList, 'lessonIssues' | 'lessonIssuesCovered'>>(
  list: T,
  saved: LearnLessonIssuesEmail,
  lesson: string | null,
): T {
  const asked = !!lesson && saved.lessonIssues && saved.lessonIssuesAsked.includes(lesson);
  return { ...list, lessonIssues: saved.lessonIssues, lessonIssuesCovered: asked ? true : list.lessonIssuesCovered };
}
