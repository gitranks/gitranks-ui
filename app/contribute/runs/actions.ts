'use server';

import { viewerLogin } from '@/lib/contribute/contribute.data';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/contribute/errors';
import { type ContributeRunsPage, RUNS_PAGE_SIZE, runsFilterOf, runsHref, runsQueryOf } from '@/lib/contribute/runs';
import { ContributeRunsDocument } from '@/lib/contribute/runs.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

export type RunsPageInput = { href: string; after: string };

/**
 * The next page of the Runs page after a cursor, under the filters of the page's URL (`href`, read again here: the
 * client's word is only the URL it shows).
 */
export async function readRunsPage(input: RunsPageInput): Promise<ContributeActionResult<ContributeRunsPage | null>> {
  const after = typeof input?.after === 'string' ? input.after : '';
  if (!after || after.length > 64) return { ok: false, error: 'INVALID', message: 'No more runs to read.' };
  const href = typeof input?.href === 'string' ? input.href : '';
  const query = runsQueryOf(Object.fromEntries(new URLSearchParams(href.split('?')[1] ?? '')));
  if (runsHref(query) !== href) return { ok: false, error: 'INVALID', message: 'Reload the page to read more runs.' };
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const { contributeRuns } = await graphqlDirect(
      ContributeRunsDocument,
      { filter: runsFilterOf(query), after, first: RUNS_PAGE_SIZE },
      { source: 'client', githubLogin },
    );
    return { ok: true, data: contributeRuns };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}
