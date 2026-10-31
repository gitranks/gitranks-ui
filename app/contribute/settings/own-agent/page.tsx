import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '../../components/page-skeleton';
import { OwnAgentSettingsView } from '../../components/settings-pages';

export const metadata: Metadata = { title: 'Your own agent' };

export default function ContributeOwnAgentSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <OwnAgentSettingsView />
      </Suspense>
    </main>
  );
}
