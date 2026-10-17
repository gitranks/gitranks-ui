import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CountryOrderSwitcher } from './components/country-order-switcher';
import { isCountrySummaryOrder } from './utils/is-country-summary-order';
import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { CountrySummaryOrder } from '@/types/generated/graphql';
import type { UserRankProp } from '@/types/ranking.types';
import { parsePageParam } from '@/utils/parse-page-param';

const ORDER_DESCRIPTIONS: Record<CountrySummaryOrder, string> = {
  [CountrySummaryOrder.Stars]: 'Countries ranked by the stars on GitHub repositories owned by their developers.',
  [CountrySummaryOrder.Contributions]:
    'Countries ranked by the stars on external GitHub repositories where their developers have merged pull requests.',
  [CountrySummaryOrder.Followers]: 'Countries ranked by the combined GitHub followers of their developers.',
  [CountrySummaryOrder.Users]: 'Countries ranked by their number of ranked GitHub developers.',
};

export async function generateMetadata({ params }: LayoutProps<'/countries/[orderBy]/[page]'>): Promise<Metadata> {
  const { orderBy, page: pageParam } = await params;
  const page = parsePageParam(pageParam);

  if (!isCountrySummaryOrder(orderBy) || !page) {
    notFound();
  }

  const order = orderBy.toUpperCase() as CountrySummaryOrder;
  const rankProp = order.slice(0, 1).toLowerCase() as UserRankProp;

  return pageMetadata({
    title: `Country ${RANK_NAME[rankProp]}ing${pageSuffix(page)}`,
    description: `${ORDER_DESCRIPTIONS[order]} See where your country ranks.`,
    path: `/countries/${order.toLowerCase()}/${page}`,
  });
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
            <h1 className="text-2xl font-semibold flex items-center gap-2">Country Rankings</h1>
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
