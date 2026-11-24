import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LearnTab } from '@/app/(workspace)/learn/components/learn-tab-view';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { WorkspaceSignIn } from '@/components/workspace/workspace-sign-in';
import { LEARN_EARLIER_METADATA } from '@/lib/learn/lesson-seo';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

export const metadata: Metadata = LEARN_EARLIER_METADATA;

/**
 * The page is a person's own: a visitor is asked to sign in and comes back here, an account the workspace is not open
 * to gets the 404, one being set up goes to Contribute's home, which says so.
 */
async function LearnEarlier() {
  const gate = await loadWorkspaceGate();
  if (gate.kind === 'signed-out') {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">
        <WorkspaceSignIn />
      </main>
    );
  }
  if (gate.kind === 'setting-up') redirect(WORKSPACE_PATHS.contribute);
  if (gate.kind !== 'open') notFound();
  return <LearnTab />;
}

/**
 * Learn as it worked before its courses: your agent fixes an issue and you take a lesson on the fix. Not indexed and
 * not in Learn's bar; Learn home's foot links it. Its start pages keep their addresses.
 */
export default function LearnEarlierPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <LearnEarlier />
    </Suspense>
  );
}
