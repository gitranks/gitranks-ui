import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeSessionSkeleton } from '@/components/workspace/page-skeleton';
import { ApprovePageScreen } from '@/components/workspace/pull-request/approve-page';

/** The person's own page: named plainly, never indexed (the layout's). */
export const metadata: Metadata = { title: 'Approve and send' };

/** Approve and send, one screen for Learn and Contribute: signed in only (the layout's gate). */
export default function ApprovePage({
  params,
  searchParams,
}: PageProps<'/my/pull-requests/[owner]/[repo]/[issue]/approve'>) {
  return (
    <Suspense fallback={<ContributeSessionSkeleton />}>
      <ApprovePageScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}
