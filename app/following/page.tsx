import { headers } from 'next/headers';
import { Suspense } from 'react';

import { FollowingPanel } from './components/following-panel';
import { LinkPageMain } from '@/app/follow/components/link-page';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { followCallerOf } from '@/lib/follow/follow-route';
import { followingPageOf } from '@/lib/follow/following-session';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { isInvalidLinkQuery, LINK_ERROR_PARAM } from '@/lib/link-token/link-token';

export const metadata = linkPageMetadata('Email settings');

/**
 * Where an email's "Email settings" lands, through `/l/settings` (or the confirmation page's link after its press):
 * every package the address follows. Without that link, a signed-in viewer sees every package their account follows,
 * on every channel. Opening the page changes nothing; each change is a press.
 */
export default function FollowingPage({ searchParams }: PageProps<'/following'>) {
  return (
    <>
      <Header />
      <LinkPageMain>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <Following searchParams={searchParams} />
        </Suspense>
      </LinkPageMain>
    </>
  );
}

async function Following({ searchParams }: Pick<PageProps<'/following'>, 'searchParams'>) {
  const invalid = isInvalidLinkQuery((await searchParams)[LINK_ERROR_PARAM]);
  const { state, session } = await followingPageOf(invalid, async () => followCallerOf({ headers: await headers() }));
  return <FollowingPanel initial={state} session={session} />;
}
