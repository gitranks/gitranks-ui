import { notFound } from 'next/navigation';

import { FairUseAnswerScreen } from './fair-use-answer';
import { WorkspaceSignIn } from '@/components/workspace/workspace-sign-in';
import { loadContributeEmailSettings, loadFairUseNotice } from '@/lib/workspace/contribute.data';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';

/**
 * The answer page's reads: the message, and whether the user has an address it went to as well. Signed out (or with a
 * session the server cannot read), it asks the visitor to sign in and comes back to this address, as the pages under
 * `/my` do: the email that links it reaches them anywhere. A message the API does not answer for the signed-in user
 * (another user's, none, an id it never gives, hidden, any failure) is not found.
 */
export async function FairUseAnswerView({ noticeId }: { noticeId: string }) {
  // An outage is not a sign-in: the message's own read then fails, and that is not found.
  const gate = await loadWorkspaceGate().catch(() => null);
  if (gate?.kind === 'signed-out') return <WorkspaceSignIn />;
  const [notice, email] = await Promise.all([loadFairUseNotice(noticeId), loadContributeEmailSettings()]);
  if (!notice) notFound();
  return <FairUseAnswerScreen notice={notice} byEmail={Boolean(email?.to)} />;
}
