import type { Metadata } from 'next';
import { Suspense } from 'react';

import { GoalSettingsView } from '@/app/(workspace)/my/settings/components/settings-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Goal and level' };

/** Goal and level: what every lesson is written for. A 404 where Learn is not open. */
export default function GoalSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <GoalSettingsView />
      </Suspense>
    </main>
  );
}
