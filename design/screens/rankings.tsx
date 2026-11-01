import type { Screen } from '../registry';
import { GlobalRankingFrame, GlobalRankingScreen } from '@/app/by/[rankingType]/components/global-ranking-view';
import {
  countries,
  globalRankings,
  leadingLanguages,
  rankedCounts,
} from '@/components/ranking-table/__fixtures__/global-rankings';
import { RankingTypeClient } from '@/types/ranking.types';

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
];
