import { Suspense } from 'react';

import { FollowingPanel } from './components/following-panel';
import { LinkPageMain } from '@/app/follow/components/link-page';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { settingsPageState } from '@/lib/link-token/link-pages';

export const metadata = linkPageMetadata('Email settings');

/**
 * Where an email's "Email settings" lands, through `/l/settings` (or the confirmation page's link after its press):
 * every package the address follows. Opening the page changes nothing; each change is a press.
 */
export default function FollowingPage() {
  return (
    <>
      <Header />
      <LinkPageMain>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <Following />
        </Suspense>
      </LinkPageMain>
    </>
  );
}

async function Following() {
  return <FollowingPanel initial={await settingsPageState()} />;
}
