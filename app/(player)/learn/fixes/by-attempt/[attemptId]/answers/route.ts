import { NextResponse } from 'next/server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { learnFixAnswersPath } from '@/lib/learn/paths';
import { fixAddressOf } from '@/lib/learn/walkthrough';
import { LearnFixAddressByAttemptDocument } from '@/lib/learn/walkthrough.documents';
import { SITE_URL } from '@/lib/seo/site';
import { ATTEMPT_ID } from '@/lib/workspace/paths';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** Nothing there: a plain 404 nobody keeps. */
const missing = () => new NextResponse('Not found', { status: 404, headers: NO_STORE });

/**
 * The fixer's answers by the attempt that made the fix: the link a Learn pull request's footer gives, written before
 * the pull request had a number. Asks the API where the answers are and sends the browser there (a 307 on the site's
 * own address, nobody keeps it); the answers page itself says when they are kept private. An attempt with no pull
 * request yet, an id of another shape, an API that does not answer or does not know the read: a 404.
 */
export async function GET(request: Request, { params }: RouteContext<'/learn/fixes/by-attempt/[attemptId]/answers'>) {
  const { attemptId } = await params;
  if (!ATTEMPT_ID.test(attemptId)) return missing();
  const address = await graphqlDirect(LearnFixAddressByAttemptDocument, { attempt: attemptId }, { source: 'ssr' }).then(
    ({ learnFixAddress }) => fixAddressOf(learnFixAddress),
    () => null,
  );
  if (!address || address.state === 'MISSING' || !address.owner || !address.repo || !address.number) return missing();
  if (!address.login) return missing();
  const target = learnFixAnswersPath(
    { nameWithOwner: `${address.owner}/${address.repo}`, number: address.number },
    address.login,
  );
  const response = NextResponse.redirect(new URL(target, SITE_URL || request.url), 307);
  response.headers.set('Cache-Control', NO_STORE['Cache-Control']);
  return response;
}
