import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';
import { Button } from '@/components/ui/button';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Badges for your README',
  description:
    'GitRanks badges for developers, repositories and organizations: ranks, stars, star history and contributors, drawn live. Pick one and copy its code for a README or a site.',
  path: '/badge/gallery',
});

export default function BadgeGalleryLayout({ children }: LayoutProps<'/badge/gallery'>) {
  return (
    <>
      <Header />

      <Page className="gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold">Badges for your README</h1>
            <p className="text-muted-foreground">
              Live ranks from GitRanks, recalculated every few days. Each example shows the current #1; make the same
              badge for any developer, repository or organization.
            </p>
          </div>
          <Button asChild className="self-start sm:self-auto">
            <Link
              href="/badge/builder"
              rel="nofollow"
              className="text-primary-foreground no-underline hover:text-primary-foreground"
            >
              Make yours
            </Link>
          </Button>
        </div>

        {children}
      </Page>
    </>
  );
}
