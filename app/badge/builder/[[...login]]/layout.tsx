import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageMetadata } from '@/lib/seo/page-metadata';

// Every `/badge/builder/<login>` canonicalizes to the bare builder too (see the page).
export const metadata: Metadata = pageMetadata({
  title: 'Badge Builder',
  description:
    'Generate custom GitHub badges with GitRanks. Show your global and country rankings, percentile, monthly changes, and progress toward the next tier.',
  path: '/badge/builder',
});

export default function BadgeLayout({ children }: LayoutProps<'/badge/builder/[[...login]]'>) {
  return (
    <>
      <Header />

      <Page className="gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Badge Builder</h1>
          <div>Create a badge to showcase your GitHub rank in portfolio or anywhere you like!</div>
        </div>

        {children}
      </Page>
    </>
  );
}
