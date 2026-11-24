import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { FaqScreen } from '@/app/contribute/components/faq';
import { issueRulesLive } from '@/lib/workspace/rules-live';

export const metadata: Metadata = {
  title: 'Questions',
  description:
    'GitRanks Contribute: how your agent signs in, whose name is on the pull request, what happens when the agent is wrong, what it costs, credits, beta and autopilot.',
};

/** The questions with the one on full issues a day once the API says those rules are live; never fails. */
async function LiveFaq() {
  await connection();
  return <FaqScreen rulesLive={await issueRulesLive()} />;
}

/**
 * The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. Today's
 * questions at once, then the one on full issues a day once it is live.
 */
export default function FaqPage() {
  return (
    <Suspense fallback={<FaqScreen />}>
      <LiveFaq />
    </Suspense>
  );
}
