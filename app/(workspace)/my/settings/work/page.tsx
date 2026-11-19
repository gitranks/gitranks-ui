import type { Metadata } from 'next';
import { Suspense } from 'react';

import { WorkSettingsView } from '@/app/contribute/components/settings-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'What you work on' };

export default function WorkSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <WorkSettingsView />
      </Suspense>
    </main>
  );
}
