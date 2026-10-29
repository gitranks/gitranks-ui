import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ConnectView } from '../components/connect-view';
import { ContributePageSkeleton } from '../components/page-skeleton';

export const metadata: Metadata = { title: 'Connect Claude' };

export default function ContributeConnect() {
  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-7 px-4 pt-9 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <ConnectView />
      </Suspense>
    </main>
  );
}
