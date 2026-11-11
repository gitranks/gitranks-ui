import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLanguageSummaryOrder } from './utils/is-language-summary-order';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { LanguageSummaryOrder } from '@/types/generated/graphql';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope } from '@/utils/resolve-route-names';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

const OPEN_A_LANGUAGE = ' Open a language to see its top developers.';

/** The description per order: the first sentence, which gets the page clause, then the rest. */
const ORDER_DESCRIPTIONS: Record<LanguageSummaryOrder, (where: string) => [string, string]> = {
  [LanguageSummaryOrder.Score]: (where) => [
    `Programming languages ranked by the stars of public GitHub repositories written in them${where}`,
    OPEN_A_LANGUAGE,
  ],
  [LanguageSummaryOrder.Size]: (where) => [
    `Programming languages ranked by total code size across the public repositories of developers on GitRanks${where}`,
    OPEN_A_LANGUAGE,
  ],
  [LanguageSummaryOrder.Users]: (where) => [
    `Programming languages ranked by how many developers on GitRanks${where} have them among their top 5`,
    '',
  ],
};

export async function generateMetadata({
  params,
}: LayoutProps<'/languages/[country]/[orderBy]/[page]'>): Promise<Metadata> {
  const { page: pageParam, orderBy, country } = await params;
  const page = parsePageParam(pageParam);
  const countryName = await resolveCountryScope(decodeURIComponent(country));

  if (!isLanguageSummaryOrder(orderBy) || !page || !countryName) {
    notFound();
  }

  const isGlobal = countryName === GLOBAL_SCOPE;
  const order = orderBy.toUpperCase() as LanguageSummaryOrder;
  const [sentence, rest] = ORDER_DESCRIPTIONS[order](isGlobal ? '' : ` in ${countryName}`);

  return pageMetadata({
    title: `${isGlobal ? 'Global' : countryName} Language Rankings${pageSuffix(page)}`,
    description: `${sentence}${pageClause(page)}.${rest}`,
    path: `/languages/${encodeURIComponent(countryName)}/${order.toLowerCase()}/${page}`,
  });
}

export async function generateStaticParams() {
  const page = '1';
  const country = 'global';
  return [
    { orderBy: 'score', country, page },
    { orderBy: 'size', country, page },
    { orderBy: 'users', country, page },
  ];
}

export default async function LanguagesSummaryLayout({
  children,
  params,
}: LayoutProps<'/languages/[country]/[orderBy]/[page]'>) {
  const { country, orderBy } = await params;
  const countryName = await resolveCountryScope(decodeURIComponent(country));
  const orderByUpper = orderBy.toUpperCase();

  if (!isLanguageSummaryOrder(orderByUpper) || !countryName) {
    return notFound();
  }

  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">{children}</Page>
    </>
  );
}
