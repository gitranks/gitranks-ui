import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LANGUAGE } from '@/app/app.consts';
import { Header } from '@/components/header/header';
import { NewBadge } from '@/components/new-badge/new-badge';
import { Page } from '@/components/page/page';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';

import { LanguageCountrySelect } from './components/language-country-select';
import { LanguageOrderSwitcher } from './components/language-order-switcher';
import { isLanguageSummaryOrder } from './utils/is-language-summary-order';

export async function generateMetadata({
  params,
}: LayoutProps<'/languages/[country]/[orderBy]/[page]'>): Promise<Metadata> {
  const { page, orderBy, country } = await params;

  if (!isLanguageSummaryOrder(orderBy)) {
    throw new Error(`Invalid order by: ${orderBy}`);
  }

  return {
    title: `${country === 'global' ? 'Global' : country} Language Rankings · Page ${page} · GitRanks`,
    description: 'Discover GitHub language rankings. See where your language ranks.',
  };
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
  const countryName = decodeURIComponent(country);
  const orderByUpper = orderBy.toUpperCase();

  if (!isLanguageSummaryOrder(orderByUpper)) {
    return notFound();
  }

  const isGlobal = country === 'global';

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
