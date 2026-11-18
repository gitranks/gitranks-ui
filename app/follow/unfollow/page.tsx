import { Suspense } from 'react';

import { LinkPageMain } from '../components/link-page';
import { UnfollowPanel } from './unfollow-panel';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { unfollowPageState } from '@/lib/link-token/link-pages';
import { isInvalidLinkQuery, LINK_ERROR_PARAM } from '@/lib/link-token/link-token';

export const metadata = linkPageMetadata('Unfollow a package');

/**
 * Where an email's "Unfollow <package>" lands, through `/l/unfollow`: that follow and one Unfollow button, then Undo.
 * Opening the page changes nothing.
 */
export default function UnfollowPage({ searchParams }: PageProps<'/follow/unfollow'>) {
  return (
    <>
      <Header />
      <LinkPageMain>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <Unfollow searchParams={searchParams} />
        </Suspense>
      </LinkPageMain>
    </>
  );
}

async function Unfollow({ searchParams }: Pick<PageProps<'/follow/unfollow'>, 'searchParams'>) {
  const invalid = isInvalidLinkQuery((await searchParams)[LINK_ERROR_PARAM]);
  return <UnfollowPanel initial={await unfollowPageState(invalid)} />;
}
