import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthorizeScreen, type AuthorizeState, authorizeStateFor } from '../components/authorize-view';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import { ContributeOAuthRequestDocument } from '@/lib/contribute/contribute.documents';
import { REVIEW_SIGN_IN_SHOWN, requestIdOf } from '@/lib/contribute/oauth-consent';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

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
  let read: Awaited<ReturnType<typeof readRequest>>;
  try {
    read = await readRequest(requestId, login);
  } catch {
    return { kind: 'unavailable', requestId };
  }
  return authorizeStateFor(read, requestId, login);
}

/** The request, and in the same API call (one read of the viewer) whether their account is being set up. */
const readRequest = async (requestId: string, githubLogin: string) =>
  graphqlDirect(ContributeOAuthRequestDocument, { requestId }, { source: 'ssr', githubLogin });
