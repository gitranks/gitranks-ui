import type { Metadata } from 'next';

import { LearnMaintainers } from '@/app/learn/components/learn-maintainers';

export const metadata: Metadata = {
  title: 'GitRanks Learn for maintainers',
  description:
    'What a pull request made with GitRanks Learn is: an agent wrote the fix, and its author passed a check on it. Your repository rules apply.',
};

/** For the maintainer who got a Learn pull request: open to every visitor, as its footer links here. */
export default function LearnMaintainersPage() {
  return <LearnMaintainers />;
}
