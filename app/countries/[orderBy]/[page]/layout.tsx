import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import type { UserRankProp } from '@/types/ranking.types';

import { CountryOrderSwitcher } from './components/country-order-switcher';
import { isCountrySummaryOrder } from './utils/is-country-summary-order';

export async function generateMetadata({ params }: LayoutProps<'/countries/[orderBy]/[page]'>): Promise<Metadata> {
  const { orderBy, page } = await params;

  if (!isCountrySummaryOrder(orderBy)) {
    throw new Error(`Invalid order by: ${orderBy}`);
  }

  const rankProp = orderBy.slice(0, 1) as UserRankProp;

  return {
    title: `Country ${RANK_NAME[rankProp]}ing · Page ${page} · GitRanks`,
    description:
      'Discover GitHub country rankings. Compare stars, contributions, and followers by nation, updated monthly. See where your country ranks.',
  };
}

export async function generateStaticParams() {
  const page = '1';
  return [
    { orderBy: 'contributions', page },
    { orderBy: 'followers', page },
    { orderBy: 'stars', page },
    { orderBy: 'users', page },
  ];
}

export default async function CountriesLayout({ children, params }: LayoutProps<'/countries/[orderBy]/[page]'>) {
  const { orderBy } = await params;

  if (!isCountrySummaryOrder(orderBy)) {
    return notFound();
  }

  return (
    <>
      <Header />
      <Page className="gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">Country Rankings</h2>
            <CountryOrderSwitcher orderBy={orderBy} />
          </div>
          <div>
            <p>
              Explore how every nation’s dev community stacks up. Each country card shows three metrics, refreshed on
              the 1st of every month:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>User Stars:</strong> stars on repos owned by developers from this country
              </li>
              <li>
                <strong>Contrib Stars:</strong> stars on external repos where they&apos;ve merged PRs
              </li>
              <li>
                <strong>Followers:</strong> combined GitHub followers of those developers
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
