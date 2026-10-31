import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributePageSkeleton } from '../../components/page-skeleton';
import { FormSettingsView } from '../../components/settings-pages';

export const metadata: Metadata = { title: 'Agent and pull requests' };

export default function ContributeAgentSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <FormSettingsView page="agent" />
      </Suspense>
    </main>
  );
}
