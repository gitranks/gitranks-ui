import { Suspense } from 'react';

import { HeroPreviewView } from '../components/hero-link-views';
import { Header } from '@/components/header/header';
import { Skeleton } from '@/components/ui/skeleton';
import { linkPageMetadata } from '@/lib/link-token/link-page-metadata';
import { heroPreviewPageState } from '@/lib/link-token/link-pages';
import { isInvalidLinkQuery, LINK_ERROR_PARAM } from '@/lib/link-token/link-token';

export const metadata = linkPageMetadata('Preview your Unsung hero week');

/**
 * Where a heads-up's "Preview the block" lands, through `/l/hero-preview`: the home card and the archive's block for
 * the week, as visitors will see them. Opening the page changes nothing.
 */
export default function HeroPreviewPage({ searchParams }: PageProps<'/hero-link/preview'>) {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 pb-16 md:pt-12">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <Preview searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Preview({ searchParams }: Pick<PageProps<'/hero-link/preview'>, 'searchParams'>) {
  const invalid = isInvalidLinkQuery((await searchParams)[LINK_ERROR_PARAM]);
  return <HeroPreviewView state={await heroPreviewPageState(invalid)} />;
}
