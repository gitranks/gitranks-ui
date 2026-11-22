import type { LandingPackages } from '../packages-section';
import {
  dependentsRanking,
  dependentsStarsRanking,
  downloadsRanking,
  packageRankingFacts,
} from '@/app/packages/__fixtures__/package-rankings';

/** The home page's package block: the ranking fixtures' first five rows of each ranking. */
export const landingPackages: LandingPackages = {
  boards: [
    { order: 'downloads', rows: downloadsRanking.slice(0, 5) },
    { order: 'dependents-stars', rows: dependentsStarsRanking.slice(0, 5) },
    { order: 'dependents', rows: dependentsRanking.slice(0, 5) },
  ],
  ranked: packageRankingFacts.ranked,
  downloadsTo: 'November 15, 2026',
};
