import { notFound } from 'next/navigation';

import { FairUseAnswerScreen } from './fair-use-answer';
import { loadContributeEmailSettings, loadFairUseNotice } from '@/lib/workspace/contribute.data';

/**
 * The answer page's reads: the message, and whether the user has an address it went to as well. A message the API does
 * not answer for this user (another user's, none, an id it never gives, hidden, any failure) is not found.
 */
export async function FairUseAnswerView({ noticeId }: { noticeId: string }) {
  const [notice, email] = await Promise.all([loadFairUseNotice(noticeId), loadContributeEmailSettings()]);
  if (!notice) notFound();
  return <FairUseAnswerScreen notice={notice} byEmail={Boolean(email?.to)} />;
}
