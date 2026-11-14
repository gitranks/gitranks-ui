'use server';

import { ApproveContributeOAuthAsReviewerDocument } from '@/lib/contribute/contribute.documents';
import { type ContributeActionResult, REVIEW_SIGN_IN_REFUSALS, reviewSignInErrorOf } from '@/lib/contribute/errors';
import { isSafeRedirect, REVIEW_PASSWORD_MAX, REVIEW_USERNAME_MAX, requestIdOf } from '@/lib/contribute/oauth-consent';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * Apart from `actions.ts` on purpose: every action there runs as the session's user, and this one never has a session.
 */

/**
 * A directory reviewer's Allow (octoscope's OpenAI directory spec §4): the review sign-in's username and password
 * connect the review account, with no session here, and the answer is where the browser goes back to the app, checked
 * as Allow's. The password goes to the API alone and is never kept or logged.
 */
export async function approveContributeOAuthAsReviewer(
  requestId: string,
  username: string,
  password: string,
): Promise<ContributeActionResult<{ redirectTo: string }>> {
  const id = requestIdOf(String(requestId ?? ''));
  if (!id) return { ok: false, ...REVIEW_SIGN_IN_REFUSALS.EXPIRED };
  const name = String(username ?? '').trim();
  const secret = String(password ?? '');
  if (!name || !secret || name.length > REVIEW_USERNAME_MAX || secret.length > REVIEW_PASSWORD_MAX) {
    return { ok: false, ...REVIEW_SIGN_IN_REFUSALS.UNAUTHENTICATED };
  }
  let redirectTo: string;
  try {
    const data = await graphqlDirect(
      ApproveContributeOAuthAsReviewerDocument,
      { requestId: id, username: name, password: secret },
      { source: 'client' },
    );
    redirectTo = data.approveContributeOAuthAsReviewer.redirectTo;
  } catch (error) {
    return { ok: false, ...reviewSignInErrorOf(error) };
  }
  if (!isSafeRedirect(redirectTo)) {
    return {
      ok: false,
      error: 'FAILED',
      message: "We can't send you back to this app: its address isn't one we allow.",
    };
  }
  return { ok: true, data: { redirectTo } };
}
