import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';

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
          <div>
            Browse the complete collection of GitRanks badges. See design examples, colors, and styles you can use to
            showcase your GitHub achievements.
          </div>
        </div>

        <div>click on any badge to get it for your profile or visit our builder for more options</div>

        {children}
      </Page>
    </>
  );
}
