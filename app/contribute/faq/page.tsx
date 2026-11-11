import type { Metadata } from 'next';

import { FaqScreen } from '../components/faq';

export const metadata: Metadata = {
  title: 'Questions',
  description:
    'GitRanks Contribute: how your agent signs in, whose name is on the pull request, what happens when the agent is wrong, what it costs, credits, beta and autopilot.',
};

/** The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. */
export default function FaqPage() {
  return <FaqScreen />;
}
