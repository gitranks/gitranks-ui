import type { Metadata } from 'next';

import { LearnMaintainers } from '@/app/learn/components/learn-maintainers';
import { LEARN_MAINTAINERS_METADATA } from '@/lib/learn/lesson-seo';

export const metadata: Metadata = LEARN_MAINTAINERS_METADATA;

/** For the maintainer who got a Learn pull request: open to every visitor, as its footer links here. */
export default function LearnMaintainersPage() {
  return <LearnMaintainers />;
}
