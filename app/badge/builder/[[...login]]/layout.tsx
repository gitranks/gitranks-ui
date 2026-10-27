import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageMetadata } from '@/lib/seo/page-metadata';

// Every `/badge/builder/<login>` canonicalizes to the bare builder too (see the page).
export const metadata: Metadata = pageMetadata({
  title: 'Badge Builder',
  description:
    'Make a README badge for a GitHub developer, organization or repository: ranks, stars, goals, contributors and charts, styled to fit, with the code to copy.',
  path: '/badge/builder',
});

export default function BadgeLayout({ children }: LayoutProps<'/badge/builder/[[...login]]'>) {
  return (
    <>
      <Header />

      <Page className="gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Badge Builder</h1>
          <div>
            Make a badge for a developer, an organization or a repository: find it, pick a badge, style it, copy.
          </div>
        </div>

        {children}
      </Page>
    </>
  );
}
