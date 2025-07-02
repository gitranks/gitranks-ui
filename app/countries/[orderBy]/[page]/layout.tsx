import { FlameIcon } from 'lucide-react';
import type { Metadata } from 'next';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { Badge } from '@/components/ui/badge';
import { CountrySummaryOrder } from '@/types/generated/graphql';

import { CountryOrderSwitcher } from './components/country-order-switcher';

export const metadata: Metadata = {
  title: 'Country Rankings · GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore ranks based on stars, followers, contributions, and more. Dive into dynamic leaderboards and find out how you measure up against developers worldwide.',
};

type CountriesLayoutProps = Readonly<{ children: React.ReactNode; params: Promise<{ orderBy: CountrySummaryOrder }> }>;

export default async function CountriesLayout({ children, params }: CountriesLayoutProps) {
  const { orderBy } = await params;

  return (
    <>
      <Header />
      <Page className="gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              Country Rankings
              <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
                <FlameIcon />
                NEW
              </Badge>
            </h2>
            <CountryOrderSwitcher orderBy={orderBy} />
          </div>
          <div>
            <p>
              Explore how every nation’s dev community stacks up. Each country card shows three metrics, refreshed on
              the 1st of every month:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>
                ⭐ <strong>User Stars</strong> – stars on repos owned by developers from this country
              </li>
              <li>
                🔀 <strong>Contrib Stars</strong> – stars on external repos where they’ve merged PRs
              </li>
              <li>
                👥 <strong>Followers</strong> – combined GitHub followers of those developers
              </li>
            </ul>
            <p>
              You’ll also spot the current Rockstar, Contributor, and Influencer leading each category for their
              country. Dive in and see where your flag ranks!
            </p>
          </div>
        </div>

        {children}
      </Page>
    </>
  );
}
