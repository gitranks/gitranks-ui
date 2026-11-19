import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SwitchSettingsView } from '../../../components/settings-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'Switch what you work on' };

export default function ContributeSwitchSettingsPage({ params }: PageProps<'/contribute/settings/switch/[mode]'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <SwitchSettingsView params={params} />
      </Suspense>
    </main>
  );
}
