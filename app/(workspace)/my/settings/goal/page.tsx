import type { Metadata } from 'next';
import { Suspense } from 'react';

import { GoalSettingsView } from '@/app/(workspace)/my/settings/components/settings-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { learnPageMetadata } from '@/lib/workspace/learn-page-title';

/** Named only to an account Learn is open to (`learnPageMetadata`). */
export function generateMetadata(): Promise<Metadata> {
  return learnPageMetadata('Goal and level');
}

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
