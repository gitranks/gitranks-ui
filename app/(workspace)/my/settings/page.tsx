import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SettingsView } from '@/app/contribute/components/settings-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Settings' };

/** The Settings tab: what the user works on, GitHub's access, email, and deleting their data. */
export default function SettingsPage({ searchParams }: PageProps<'/my/settings'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <SettingsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
