import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';

export const metadata: Metadata = {
  title: 'Custom Badge Builder · Create Your GitRanks Badge',
  description:
    'Design your own GitRanks badge in seconds. Choose ranking type, colors, and style to create a unique badge for your GitHub profile or README.',
};

export default function BadgeBuilderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />

      <Page className="gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Badge Builder</h1>
        </div>

        {children}
      </Page>
    </>
  );
}
