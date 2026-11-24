'use server';

import { type IssuesEmailCover, type IssuesView, issuesViewOf, type LearnFixes, type LearnIssuesEmail } from './issues';
import { loadLearnFixes } from './issues.data';
import { SetLearnIssuesEmailDocument } from './issues.documents';
import { invalidAnswer, type LearnActionResult, learnErrorOf } from './learn-action';
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

/** The next page of a view's merged fixes, the same for everyone: "Show 10 more". Null on any failure. */
export async function readMoreLearnFixes(view: unknown, after: unknown): Promise<LearnFixes | null> {
  if (typeof after !== 'string' || !after || after.length > 200) return null;
  const query = view && typeof view === 'object' ? (view as Record<string, string | undefined>) : {};
  const read = await loadLearnFixes(issuesViewOf(query) satisfies IssuesView, after);
  return read.kind === 'ok' ? read.data : null;
}
