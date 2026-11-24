import type { Screen } from '../registry';
import { GlobalRankingFrame, GlobalRankingScreen } from '@/app/by/[rankingType]/components/global-ranking-view';
import { CountryRankingScreen } from '@/app/countries/[orderBy]/[page]/components/country-ranking-screen';
import { buildCountryRanking } from '@/app/countries/[orderBy]/[page]/country-ranking';
import { LanguageRankingScreen } from '@/app/languages/[country]/[orderBy]/[page]/components/language-ranking-screen';
import { buildLanguageRanking } from '@/app/languages/[country]/[orderBy]/[page]/language-ranking';
import {
  dependentsRanking,
  dependentsStarsRanking,
  downloadsRanking,
  packageRankingFacts,
} from '@/app/packages/__fixtures__/package-rankings';
import { PackageRankingFrame, PackageRankingScreen } from '@/app/packages/components/package-ranking-view';
import type { PackageRankingOrder } from '@/app/packages/package-rankings';
import { repoRankingPage } from '@/app/repos/__fixtures__/repo-rankings';
import { REPO_LANGUAGES_LINK, RepoRankingHeader } from '@/app/repos/components/repo-ranking-header';
import { RepoRankingTable } from '@/app/repos/components/repo-ranking-table';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { Pagination } from '@/components/pagination/pagination';
import {
  countries,
  globalRankings,
  leadingLanguages,
  rankedCounts,
} from '@/components/ranking-table/__fixtures__/global-rankings';
import {
  belgiumLanguagePage,
  belgiumLanguages,
  countrySummaries,
  pickerCountries,
  previousBelgiumLanguages,
  previousCountries,
  previousWorldLanguages,
  worldLanguagePage,
  worldLanguages,
} from '@/components/summary-ranking/__fixtures__/summary-rankings';
import type { PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';
import { REGISTRIES, type RegistryId } from '@/lib/packages/registries';
import { CountrySummaryOrder, LanguageSummaryOrder } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';
import { packageRankingPath } from '@/utils/package-paths';
import { getRepoRankingPath } from '@/utils/repo-paths';

const countryRanking = () => {
  const order = CountrySummaryOrder.Stars;
  const ranking = buildCountryRanking(order, 1, countrySummaries, previousCountries);
  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">
        {ranking && <CountryRankingScreen order={order} page={1} ranking={ranking} />}
      </Page>
    </>
  );
};

const languageRanking = (scope: 'global' | 'Belgium') => () => {
  const order = LanguageSummaryOrder.Score;
  const isGlobal = scope === 'global';
  const ranking = buildLanguageRanking({
    scope,
    order,
    page: 1,
    all: isGlobal ? worldLanguages : belgiumLanguages,
    pageRows: isGlobal ? worldLanguagePage : belgiumLanguagePage,
    previous: isGlobal ? previousWorldLanguages : previousBelgiumLanguages,
    world: isGlobal ? null : worldLanguages,
  });
  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">
        {ranking && (
          <LanguageRankingScreen scope={scope} order={order} page={1} ranking={ranking} countries={pickerCountries} />
        )}
      </Page>
    </>
  );
};

const COUNTRY_SOURCES = [
  'app/countries/[orderBy]/[page]/page.tsx',
  'app/countries/[orderBy]/[page]/country-ranking.ts',
  'app/countries/[orderBy]/[page]/components/country-ranking-screen.tsx',
  'app/countries/[orderBy]/[page]/components/country-ranking-tools.tsx',
  'components/summary-ranking/share-bar.tsx',
];

const LANGUAGE_SOURCES = [
  'app/languages/[country]/[orderBy]/[page]/page.tsx',
  'app/languages/[country]/[orderBy]/[page]/language-ranking.ts',
  'app/languages/[country]/[orderBy]/[page]/components/language-ranking-screen.tsx',
  'app/languages/[country]/[orderBy]/[page]/components/language-scope-picker.tsx',
  'components/summary-ranking/share-bar.tsx',
];

/**
 * Page 1 of a package ranking, as its layout and page draw it: rows, none yet, or `undefined` when not readable (then
 * its facts are not either, and the header names no date).
 */
const packageRanking =
  (order: PackageRankingOrder, rows: PackageRankRows | undefined, registry: RegistryId = 'npm') =>
  () => (
    <PackageRankingFrame
      registry={registry}
      order={order}
      downloadsThrough={order === 'downloads' && rows ? packageRankingFacts.downloadsThrough : undefined}
    >
      <PackageRankingScreen
        registry={registry}
        registryLabel={REGISTRIES[registry].label}
        order={order}
        page={1}
        rows={rows}
        facts={rows ? packageRankingFacts : undefined}
      />
    </PackageRankingFrame>
  );

const PACKAGE_RANKING_SOURCES = [
  'app/packages/[registry]/[by]/[page]/layout.tsx',
  'app/packages/[registry]/[by]/[page]/page.tsx',
  'app/packages/components/package-ranking-view.tsx',
  'app/packages/components/package-ranking-table.tsx',
  'app/packages/components/go-to-package-field.tsx',
  'app/packages/components/package-beta-notice.tsx',
];

export const RANKINGS_SCREENS: Screen[] = [
  {
    id: 'rankings-global',
    title: 'Developer ranking',
    area: 'rankings',
    route: '/by/[rankingType]/[page]',
    sources: [
      'app/by/[rankingType]/components/global-ranking-view.tsx',
      'components/ranking-table/ranking-table.tsx',
      'components/ranking-header-section/ranking-header-section.tsx',
      'components/ranking-stats/ranking-stats.tsx',
    ],
    states: [
      {
        id: 'stars-1',
        title: 'By stars, page 1',
        path: '/by/stars/1',
        height: 5300,
        render: () => (
          <GlobalRankingFrame rankingType={RankingTypeClient.Star}>
            <GlobalRankingScreen
              rankingType={RankingTypeClient.Star}
              page={1}
              rows={globalRankings('s')}
              countries={countries}
              rankedCounts={rankedCounts}
              languages={leadingLanguages}
            />
          </GlobalRankingFrame>
        ),
      },
    ],
  },
  {
    id: 'repo-ranking',
    title: 'Repository ranking',
    area: 'rankings',
    route: '/repos/[page]',
    sources: [
      'app/repos/[page]/layout.tsx',
      'app/repos/[page]/page.tsx',
      'app/repos/components/repo-ranking-table.tsx',
    ],
    states: [
      {
        id: 'page-40',
        title: 'Page 40, a row with stars not counted',
        path: getRepoRankingPath(40),
        height: 1500,
        // The layout and the page, from their parts: the page reads its rows in a server component.
        render: () => (
          <>
            <Header section="rankings" />
            <Page className="max-w-5xl gap-6">
              <RepoRankingHeader title="Repository Ranking" link={REPO_LANGUAGES_LINK} />
              <RepoRankingTable data={repoRankingPage} />
              <Pagination prev={getRepoRankingPath(39)} next={getRepoRankingPath(41)} />
            </Page>
          </>
        ),
      },
    ],
  },
  {
    id: 'country-ranking',
    title: 'Country ranking',
    area: 'rankings',
    route: '/countries/[orderBy]/[page]',
    sources: COUNTRY_SOURCES,
    states: [
      { id: 'stars-1', title: 'By stars, page 1', path: '/countries/stars/1', height: 1600, render: countryRanking },
      {
        id: 'stars-1-phone',
        title: 'By stars, page 1 · phone',
        path: '/countries/stars/1',
        width: 390,
        height: 2100,
        render: countryRanking,
      },
    ],
  },
  {
    id: 'language-ranking',
    title: 'Language ranking',
    area: 'rankings',
    route: '/languages/[country]/[orderBy]/[page]',
    sources: LANGUAGE_SOURCES,
    states: [
      {
        id: 'global-stars-1',
        title: 'Worldwide, by stars',
        path: '/languages/global/score/1',
        height: 1400,
        render: languageRanking('global'),
      },
      {
        id: 'belgium-stars-1',
        title: 'Belgium, by stars: what stands out',
        path: '/languages/Belgium/score/1',
        height: 1400,
        render: languageRanking('Belgium'),
      },
      {
        id: 'belgium-stars-1-phone',
        title: 'Belgium, by stars · phone',
        path: '/languages/Belgium/score/1',
        width: 390,
        height: 2000,
        render: languageRanking('Belgium'),
      },
    ],
  },
  {
    id: 'package-ranking',
    title: 'Package ranking',
    area: 'rankings',
    route: '/packages/[registry]/[by]/[page]',
    sources: PACKAGE_RANKING_SOURCES,
    states: [
      {
        id: 'downloads-1',
        title: 'By downloads, page 1',
        path: packageRankingPath('downloads'),
        height: 1800,
        render: packageRanking('downloads', downloadsRanking),
      },
      {
        id: 'dependents-stars-1',
        title: "By dependents' stars, page 1",
        path: packageRankingPath('dependents-stars'),
        height: 1200,
        render: packageRanking('dependents-stars', dependentsStarsRanking),
      },
      {
        id: 'dependents-1',
        title: 'By dependents, page 1',
        path: packageRankingPath('dependents'),
        height: 1200,
        render: packageRanking('dependents', dependentsRanking),
      },
      {
        id: 'empty',
        title: 'No package ranked yet',
        path: packageRankingPath('downloads'),
        height: 800,
        render: packageRanking('downloads', []),
      },
      {
        id: 'unavailable',
        title: 'The ranking not available right now',
        path: packageRankingPath('downloads'),
        height: 800,
        render: packageRanking('downloads', undefined),
      },
      {
        id: 'go-dependents-stars-1',
        title: "Go, by dependents' stars (no downloads ranking)",
        path: packageRankingPath('dependents-stars', 1, 'go'),
        height: 1200,
        render: packageRanking('dependents-stars', dependentsStarsRanking, 'go'),
      },
      {
        id: 'downloads-1-phone',
        title: 'By downloads, page 1 · phone',
        path: packageRankingPath('downloads'),
        width: 390,
        height: 2400,
        render: packageRanking('downloads', downloadsRanking),
      },
    ],
  },
];
