import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeAboutView } from '@/app/contribute/components/landing-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** One front door for search engines: this copy points at `/contribute` and is not indexed. */
export const metadata: Metadata = {
  ...pageMetadata({
    title: 'How Contribute works',
    description:
      'Fix real open-source issues with the AI you already pay for. An agent writes the fix, you review every change, and the pull request opens in your name.',
    path: WORKSPACE_PATHS.contribute,
  }),
  robots: { index: false, follow: false },
};

/** How Contribute works, for anyone: the landing members reach from the Contribute tab, with no tabs. */
export default function ContributeAboutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <ContributeAboutView />
    </Suspense>
  );
}
