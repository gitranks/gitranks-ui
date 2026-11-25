import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ContributeAboutView } from '@/app/contribute/components/landing-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { LANDING_HERO } from '@/lib/contribute/landing-copy';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * One front door for search engines: this copy names `/contribute` as its canonical. It says "index" itself, so the
 * canonical it names is followed: the section's layout says "noindex".
 */
export const metadata: Metadata = {
  ...pageMetadata({
    title: 'How Contribute works',
    description: LANDING_HERO.lead,
    path: WORKSPACE_PATHS.contribute,
  }),
  robots: { index: true, follow: true },
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
