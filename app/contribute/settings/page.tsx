import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SettingsView } from '../components/settings-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Contribute settings' };

export default function ContributeSettingsPage({ searchParams }: PageProps<'/contribute/settings'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <SettingsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
