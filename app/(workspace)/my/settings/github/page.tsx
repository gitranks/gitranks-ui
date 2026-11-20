import type { Metadata } from 'next';
import { Suspense } from 'react';

import { GithubSettingsView } from '@/app/(workspace)/my/settings/components/settings-pages';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';

export const metadata: Metadata = { title: 'GitHub access' };

/** GitHub's permission to open pull requests, for every account; GitHub's refused consent comes back here. */
export default function GithubSettingsPage({ searchParams }: PageProps<'/my/settings/github'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <Suspense fallback={<ContributePageSkeleton />}>
        <GithubSettingsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
