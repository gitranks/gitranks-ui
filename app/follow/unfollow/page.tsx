import { Suspense } from 'react';

import { LinkPageMain } from '../components/link-page';
import { UnfollowPanel } from './unfollow-panel';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { unfollowPageState } from '@/lib/link-token/link-pages';

export const metadata = linkPageMetadata('Unfollow a package');

/**
 * Where an email's "Unfollow <package>" lands, through `/l/unfollow`: that follow and one Unfollow button, then Undo.
 * Opening the page changes nothing.
 */
export default function UnfollowPage() {
  return (
    <>
      <Header />
      <LinkPageMain>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <Unfollow />
        </Suspense>
      </LinkPageMain>
    </>
  );
}

async function Unfollow() {
  return <UnfollowPanel initial={await unfollowPageState()} />;
}
