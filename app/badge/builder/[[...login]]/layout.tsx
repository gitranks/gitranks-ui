import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';

export const metadata: Metadata = {
  title: 'GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore ranks based on stars, followers, contributions, and more. Dive into dynamic leaderboards and find out how you measure up against developers worldwide.',
};

export default function BadgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
