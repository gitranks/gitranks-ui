import type { Metadata } from 'next';
import { Suspense } from 'react';

import {
  AuthorizeScreen,
  type AuthorizeState,
  authorizeStateFor,
  authorizeWithSetup,
} from '@/app/contribute/components/authorize-view';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { loadContributeSetupState, viewerLogin } from '@/lib/workspace/contribute.data';
import { ContributeOAuthRequestDocument, ContributeSignsDocument } from '@/lib/workspace/contribute.documents';
import { isManagedLogin } from '@/lib/workspace/managed-account';
import {
  authorizeNeedsSetupOf,
  authorizeSignsOf,
  REVIEW_SIGN_IN_SHOWN,
  requestIdOf,
} from '@/lib/workspace/oauth-consent';

export const metadata: Metadata = {
  title: 'Connect your agent',
  robots: { index: false, follow: false },
};

/**
 * Where an agent's sign-in to the MCP server asks the user to allow it (`?request=<id>`). Open to every visitor (the
 * proxy lets it through) and never framed (next.config's headers); rendered per request, for the session and the
 * request read now.
 */
export default function AuthorizePage({ searchParams }: PageProps<'/contribute/authorize'>) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 pt-10 pb-16">
      <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-2xl bg-muted/50" />}>
        <Authorize searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Authorize({ searchParams }: Pick<PageProps<'/contribute/authorize'>, 'searchParams'>) {
  const params = await searchParams;
  return <AuthorizeScreen state={await authorizeStateOf(params.request, params.review === '1')} />;
}

/** What the page shows for the request in its query, for the session's user. */
async function authorizeStateOf(value: string | string[] | undefined, review: boolean): Promise<AuthorizeState> {
  const requestId = requestIdOf(value);
  if (!requestId) return { kind: 'expired' };
  const login = await viewerLogin();
  // The directory reviewers' sign-in (`&review=1`): signed out only; a signed-in user allows as themselves.
  if (!login) return { kind: review && REVIEW_SIGN_IN_SHOWN ? 'review-sign-in' : 'signed-out', requestId };
  // A company-managed account: why it can't be used, before any read.
  if (isManagedLogin(login)) return { kind: 'managed', requestId };
  // The signs, read beside the request: a read that fails leaves the page as it was before them.
  const signs = readSigns(login);
  let read: Awaited<ReturnType<typeof readRequest>>;
  try {
    read = await readRequest(requestId, login);
  } catch {
    return { kind: 'unavailable', requestId };
  }
  const state = authorizeStateFor(read, requestId, login, authorizeNeedsSetupOf(await signs));
  // No profile: where its setup stands now, read apart (its first read is asked here when none was).
  return state.kind === 'no-profile' ? authorizeWithSetup(state, await loadContributeSetupState()) : state;
}

/** The viewer's two signs; null when they cannot be read. */
const readSigns = (githubLogin: string) =>
  graphqlDirect(ContributeSignsDocument, undefined, { source: 'ssr', githubLogin }).then(
    ({ contribute }) => authorizeSignsOf(contribute),
    () => null,
  );

/** The request, and in the same API call (one read of the viewer) whether their account is being set up. */
const readRequest = async (requestId: string, githubLogin: string) =>
  graphqlDirect(ContributeOAuthRequestDocument, { requestId }, { source: 'ssr', githubLogin });
