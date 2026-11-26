import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { issuesViewOf } from '@/lib/learn/issues';
import { loadIssuesList } from '@/lib/learn/issues.data';
import { loadLearnSign } from '@/lib/learn/learn-sign.data';
import { loadContributeSetupState } from '@/lib/workspace/contribute.data';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';

const NEVER_KEPT = { headers: { 'Cache-Control': 'private, no-store' } };

/**
 * The signed-in person's five on Issues, read in the browser after the visitor's five are up, by the view in the
 * query (`for-you`, `learned`, `lesson`, `course`, `language`, as the page's address writes them). The Issues page is
 * the only caller, so the read says it comes from there. Answers `{ state }`:
 * - `ok`, with `list` and the masked list's `reads` (the day's full issues, the numbers of a night); on a view of one
 *   lesson also `learnOnboarded`, the Learn sign, for the box's "Email me issues for my lessons": true or false, null
 *   when it cannot be read (read beside the list, so it fails alone);
 * - `unavailable`: the API answers no list, or does not know the read yet;
 * - `managed`: no list, for a company-managed GitHub account, which can't be used;
 * - `failed`: anything else;
 * - `signed-out`, without asking the API.
 * Never kept: every press changes it.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  if (!viewer) return NextResponse.json({ state: 'signed-out' }, NEVER_KEPT);
  const view = issuesViewOf(Object.fromEntries(req.nextUrl.searchParams));
  const [read, reads, learnOnboarded] = await Promise.all([
    loadIssuesList(viewer, view),
    loadMaskedListReads(),
    view.lesson ? loadLearnSign(viewer) : null,
  ]);
  if (read.kind === 'unavailable' && (await loadContributeSetupState()) === 'managed')
    return NextResponse.json({ state: 'managed' }, NEVER_KEPT);
  if (read.kind !== 'ok') return NextResponse.json({ state: read.kind }, NEVER_KEPT);
  const sign = view.lesson ? { learnOnboarded } : {};
  return NextResponse.json({ state: 'ok', list: read.data, reads, ...sign }, NEVER_KEPT);
});
