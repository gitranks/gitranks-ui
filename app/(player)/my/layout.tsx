import type { Metadata } from 'next';
import { type ReactNode, Suspense } from 'react';

import { Header } from '@/components/header/header';
import { MyGate } from '@/components/workspace/my-gate';
import { OriginHeader } from '@/components/workspace/origin-header';

/** The user's own pages: never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The player's pages under `/my`, which both products open (Approve): the site header of the product the person came
 * from, as the workspace's pages pick their bar, so a Contribute page never marks Learn; until the person is read, the
 * header with neither marked. The page behind the gate every page under `/my` has (`MyGate`). Each page draws its own
 * strip under the header (`PlayerStrip`).
 */
export default function PlayerMyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<Header />}>
        <OriginHeader />
      </Suspense>
      <MyGate>{children}</MyGate>
    </>
  );
}
