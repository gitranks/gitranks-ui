import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthorizeScreen, type AuthorizeState } from '../components/authorize-view';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import { ContributeOAuthRequestDocument } from '@/lib/contribute/contribute.documents';
import { requestIdOf } from '@/lib/contribute/oauth-consent';
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
  return <AuthorizeScreen state={await authorizeStateOf((await searchParams).request)} />;
}

/** What the page shows for the request in its query, for the session's user. */
async function authorizeStateOf(value: string | string[] | undefined): Promise<AuthorizeState> {
  const requestId = requestIdOf(value);
  if (!requestId) return { kind: 'expired' };
  const login = await viewerLogin();
  if (!login) return { kind: 'signed-out', requestId };
  let request: Awaited<ReturnType<typeof readRequest>>;
  try {
    request = await readRequest(requestId, login);
  } catch {
    return { kind: 'unavailable', requestId };
  }
  // Null: Contribute is hidden from this account (off the preview, or no profile here).
  if (!request) return { kind: 'not-open', requestId };
  if (request.status === 'EXPIRED') return { kind: 'expired' };
  if (request.status === 'APPROVED') return { kind: 'approved', requestId, clientName: request.clientName };
  if (!request.previewAllowed) return { kind: 'not-open', requestId };
  return { kind: 'pending', requestId, login, request };
}

const readRequest = async (requestId: string, githubLogin: string) =>
  (await graphqlDirect(ContributeOAuthRequestDocument, { requestId }, { source: 'ssr', githubLogin }))
    .contributeOAuthRequest;
