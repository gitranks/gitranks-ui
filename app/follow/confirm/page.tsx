import { Suspense } from 'react';

import { LinkPageMain } from '../components/link-page';
import { ConfirmPanel } from './confirm-panel';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { confirmPageState } from '@/lib/link-token/link-pages';

export const metadata = linkPageMetadata('Confirm a follow');

/**
 * Where a confirmation email's button lands, through `/l/confirm`: the packages waiting for the press, and one
 * Confirm button. Opening the page confirms nothing: mail scanners open links too.
 */
export default function ConfirmFollowPage() {
  return (
    <>
      <Header />
      <LinkPageMain>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <Confirm />
        </Suspense>
      </LinkPageMain>
    </>
  );
}

async function Confirm() {
  return <ConfirmPanel initial={await confirmPageState()} />;
}
