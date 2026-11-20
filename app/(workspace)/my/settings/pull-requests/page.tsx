import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PullRequestsSettingsView } from '@/app/(workspace)/my/settings/components/settings-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Pull requests' };

/** The limits on pull requests and attempts, which bind both agents. */
export default function PullRequestsSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <PullRequestsSettingsView />
      </Suspense>
    </main>
  );
}
