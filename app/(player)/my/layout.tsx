import { type ReactNode, Suspense } from 'react';

import { Header } from '@/components/header/header';
import { OriginHeader } from '@/components/workspace/origin-header';

/**
 * The player's pages under `/my`, which both products open (Approve): the site header of the product the person came
 * from, as the workspace's pages pick their bar, so a Contribute page never marks Learn. Until the person is read, the
 * header with neither marked. Each page draws its own strip under it (`PlayerStrip`).
 */
export default function PlayerMyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<Header />}>
        <OriginHeader />
      </Suspense>
      {children}
    </>
  );
}
