import type { Screen } from '../registry';
import { GlobalRankingFrame, GlobalRankingScreen } from '@/app/by/[rankingType]/components/global-ranking-view';
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
import { RankingTypeClient } from '@/types/ranking.types';
import { getRepoRankingPath } from '@/utils/repo-paths';

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
];
