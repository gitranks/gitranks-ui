import { Info } from 'lucide-react';
import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';
import { Alert, AlertTitle } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'Badge Gallery · GitRanks',
  description:
    'Browse the complete collection of GitRanks badges. See design examples, colors, and styles you can use to showcase your GitHub achievements.',
};

export default function BadgeGalleryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />

      <Page className="gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Badge Gallery</h1>
        </div>

        <Alert variant="default">
          <Info />
          <AlertTitle className="line-clamp-none">
            Click any badge to open it in the builder, or <Link href="/badge/builder">visit the builder</Link> directly
            for more customization options.
          </AlertTitle>
        </Alert>

        {children}
      </Page>
    </>
  );
}
