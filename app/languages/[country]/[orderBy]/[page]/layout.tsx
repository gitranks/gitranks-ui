import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LanguageCountrySelect } from './components/language-country-select';
import { LanguageOrderSwitcher } from './components/language-order-switcher';
import { isLanguageSummaryOrder } from './utils/is-language-summary-order';
import { LANGUAGE } from '@/app/app.consts';
import { Header } from '@/components/header/header';
import { NewBadge } from '@/components/new-badge/new-badge';
import { Page } from '@/components/page/page';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { LanguageSummaryOrder } from '@/types/generated/graphql';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope } from '@/utils/resolve-route-names';

const OPEN_A_LANGUAGE = ' Open a language to see its top developers.';

/** The description per order: the first sentence, which gets the page clause, then the rest. */
const ORDER_DESCRIPTIONS: Record<LanguageSummaryOrder, (where: string) => [string, string]> = {
  [LanguageSummaryOrder.Score]: (where) => [
    `Programming languages ranked by the stars of public GitHub repositories written in them${where}`,
    OPEN_A_LANGUAGE,
  ],
  [LanguageSummaryOrder.Size]: (where) => [
    `Programming languages ranked by total code size across public GitHub repositories with 5+ stars${where}`,
    OPEN_A_LANGUAGE,
  ],
  [LanguageSummaryOrder.Users]: (where) => [
    `Programming languages ranked by how many GitHub developers${where} use them in public repositories with 5+ stars`,
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

  const isGlobal = countryName === GLOBAL_SCOPE;

  const countries = await fetchCountries();

  const countryNames = countries
    .slice(0, 100)
    .map((country) => country.name)
    .toSorted((a, b) => a.localeCompare(b));

  return (
    <>
      <Header />
      <Page className="gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              {isGlobal ? 'Global' : countryName} Language Rankings
              <NewBadge />
            </h2>
            <div className="flex items-center gap-6 flex-wrap">
              <LanguageCountrySelect value={countryName} countries={countryNames} />
              <LanguageOrderSwitcher orderBy={orderByUpper} country={countryName} />
            </div>
          </div>
          <div>
            <p>{LANGUAGE.description}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>Stars:</strong> {LANGUAGE.order.stars}
              </li>
              <li>
                <strong>Size:</strong> {LANGUAGE.order.size}
              </li>
              <li>
                <strong>Users:</strong> {LANGUAGE.order.users}
              </li>
            </ul>
          </div>
        </div>

        {children}
      </Page>
    </>
  );
}
