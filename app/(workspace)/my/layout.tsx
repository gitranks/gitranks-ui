import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { WorkspaceSignIn } from '@/components/workspace/workspace-sign-in';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** The user's own pages: never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The workspace's pages under `/my`. The proxy lets a visitor without a session through to them, since emails and
 * agents link here: the page then asks them to sign in and comes back to the same address. An account the workspace is
 * not open to gets the 404, one being set up goes to Contribute's home, which says so.
 */
export default function MyLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-4 pt-8 pb-16">
          <ContributePageSkeleton />
        </main>
      }
    >
      <MyGate>{children}</MyGate>
    </Suspense>
  );
}

async function MyGate({ children }: { children: ReactNode }) {
  // An outage is the page's to say ("try again"), never a 404: the page reads the user again and throws.
  const gate = await loadWorkspaceGate().catch(() => null);
  if (gate?.kind === 'signed-out') {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">
        <WorkspaceSignIn />
      </main>
    );
  }
  if (gate?.kind === 'hidden') notFound();
  if (gate?.kind === 'setting-up') redirect(WORKSPACE_PATHS.contribute);
  return children;
}
