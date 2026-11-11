import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isCountrySummaryOrder } from './utils/is-country-summary-order';
import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { CountrySummaryOrder } from '@/types/generated/graphql';
import type { UserRankProp } from '@/types/ranking.types';
import { parsePageParam } from '@/utils/parse-page-param';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

const ORDER_DESCRIPTIONS: Record<CountrySummaryOrder, string> = {
  [CountrySummaryOrder.Stars]: 'Countries ranked by the stars on GitHub repositories owned by their developers',
  [CountrySummaryOrder.Contributions]:
    'Countries ranked by the stars on external GitHub repositories where their developers have merged pull requests',
  [CountrySummaryOrder.Followers]: 'Countries ranked by the combined GitHub followers of their developers',
  [CountrySummaryOrder.Users]: 'Countries ranked by how many of their GitHub developers are on GitRanks',
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
    description: `${ORDER_DESCRIPTIONS[order]}${pageClause(page)}. See where your country ranks.`,
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
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">{children}</Page>
    </>
  );
}
