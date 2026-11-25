'use server';

import { type IssuesEmailCover, type IssuesView, issuesViewOf, type LearnFixes, type LearnIssuesEmail } from './issues';
import { loadLearnFixes } from './issues.data';
import { SetLearnIssuesEmailDocument, SetLearnLessonIssuesEmailDocument } from './issues.documents';
import { invalidAnswer, type LearnActionResult, learnErrorOf } from './learn-action';
import { type LearnLessonIssuesEmail, learnLessonIssuesEmailOf } from './lesson-issues-email';
import { isContentSlug } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';

const isCover = (value: unknown): value is IssuesEmailCover => value === 'FOR_YOU' || value === 'LEARNED';

/**
 * Turns "A new issue for you" on (with the list it covers) or off, as the session's user, never one named in the
 * arguments. Anything not of that shape is refused before the API is asked. Null data when Learn is not open to them.
 */
export async function setLearnIssuesEmailAction(
  on: unknown,
  cover: unknown,
): Promise<LearnActionResult<LearnIssuesEmail | null>> {
  if (typeof on !== 'boolean' || (on && !isCover(cover))) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(
      SetLearnIssuesEmailDocument,
      { on, cover: on ? (cover as IssuesEmailCover) : null },
      { source: 'client', githubLogin },
    );
    const saved = data.setLearnIssuesEmail;
    if (saved === null) return { ok: true, data: null };
    return typeof saved?.newIssues === 'boolean' ? { ok: true, data: saved } : { ok: false, error: 'FAILED' };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}

/**
 * Turns "Email me issues for my lessons" on or off as the session's user, never one named in the arguments. Turned on
 * from a lesson's view, it also adds that lesson (a slug of a lesson's shape; the API checks it is a live one). Off
 * sends no lesson, and turns the whole switch off. Null data when Learn is not open to the person.
 */
export async function setLearnLessonIssuesEmailAction(
  on: unknown,
  lesson: unknown,
): Promise<LearnActionResult<LearnLessonIssuesEmail | null>> {
  if (typeof on !== 'boolean') return invalidAnswer();
  if (lesson !== null && lesson !== undefined && (typeof lesson !== 'string' || !isContentSlug(lesson))) {
    return invalidAnswer();
  }
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(
      SetLearnLessonIssuesEmailDocument,
      { on, lesson: on && typeof lesson === 'string' ? lesson : null },
      { source: 'client', githubLogin },
    );
    if (data.setLearnLessonIssuesEmail === null) return { ok: true, data: null };
    const saved = learnLessonIssuesEmailOf(data.setLearnLessonIssuesEmail);
    return saved ? { ok: true, data: saved } : { ok: false, error: 'FAILED' };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}

/** The next page of a view's merged fixes, the same for everyone: "Show 10 more". Null on any failure. */
export async function readMoreLearnFixes(view: unknown, after: unknown): Promise<LearnFixes | null> {
  if (typeof after !== 'string' || !after || after.length > 200) return null;
  const query = view && typeof view === 'object' ? (view as Record<string, string | undefined>) : {};
  const read = await loadLearnFixes(issuesViewOf(query) satisfies IssuesView, after);
  return read.kind === 'ok' ? read.data : null;
}
