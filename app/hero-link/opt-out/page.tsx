import { Suspense } from 'react';

import { HeroOptOutPanel } from './opt-out-panel';
import { LinkPageMain } from '@/app/follow/components/link-page';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { heroOptOutPageState } from '@/lib/link-token/link-pages';
import { isInvalidLinkQuery, LINK_ERROR_PARAM } from '@/lib/link-token/link-token';

export const metadata = linkPageMetadata('Opt out of Unsung hero');

/**
 * Where a heads-up's "No thanks, opt me out" lands, through `/l/hero-opt-out`: the week and one Opt out button, then
 * Undo for 7 days. Opening the page opts nothing out: mail scanners open links too.
 */
export default function HeroOptOutPage({ searchParams }: PageProps<'/hero-link/opt-out'>) {
  return (
    <>
      <Header />
      <LinkPageMain>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <OptOut searchParams={searchParams} />
        </Suspense>
      </LinkPageMain>
    </>
  );
}

async function OptOut({ searchParams }: Pick<PageProps<'/hero-link/opt-out'>, 'searchParams'>) {
  const invalid = isInvalidLinkQuery((await searchParams)[LINK_ERROR_PARAM]);
  return <HeroOptOutPanel initial={await heroOptOutPageState(invalid)} />;
}
