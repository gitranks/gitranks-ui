import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { BadgeContext } from '@/types/badge.types';
import { BadgeProfileWithRanksDocument, BadgeTiersDocument } from '@/types/generated/graphql';
import { getRankingTierData } from '@/utils/calculate-tiers/calculate-tiers';
import { ProfileTierType } from '@/utils/calculate-tiers/calculate-tiers.types';

import {
  InvalidCountryError,
  InvalidScoreError,
  NotFoundError,
  RanksAreNotAvailableError,
  TiersAreNotAvailableError,
} from './badge.errors';
import { BadgeFetchedData, BadgeV2Params } from './badge.types';
import { BADGE_META_TO_LOAD_TIERS, BADGE_TYPES_TO_LOAD_TIERS } from './templates/inline/inline.consts';
import { getLatestSnapshot } from './utils/get-latest-snapshot';

export const fetchProfileWithRanks = async (login: string, context: BadgeContext) => {
  const { user } = await graphqlDirect(BadgeProfileWithRanksDocument, {
    login,
    includeRankGlobal: context === BadgeContext.Global,
    includeRankCountry: context === BadgeContext.Country,
  });

  return user;
};

export const fetchTiers = async (params: BadgeV2Params, country?: string | null) => {
  const { ranking: rankingProp, context, meta, type } = params;

  if (!BADGE_META_TO_LOAD_TIERS.includes(meta) && !BADGE_TYPES_TO_LOAD_TIERS.includes(type)) {
    return {};
  }

  const tiersName = context === BadgeContext.Global ? 'global' : country!;

  const { rankTiersByName } = await graphqlDirect(BadgeTiersDocument, {
    tiersName,
    includeSTiers: rankingProp === 's',
    includeCTiers: rankingProp === 'c',
    includeFTiers: rankingProp === 'f',
  });

  const tiers = rankTiersByName?.[`${rankingProp}Tiers`];

  if (!tiers) {
    throw new TiersAreNotAvailableError();
  }

  const rankedCount = rankTiersByName[`${rankingProp}Users`] ?? 0;

  return { tiers, rankedCount };
};

export const badgeDataLoader = async (login: string, params: BadgeV2Params): Promise<BadgeFetchedData> => {
  const { ranking: rankingProp, context } = params;

  const user = await fetchProfileWithRanks(login, context);

  if (!user) {
    throw new NotFoundError();
  }

  const score = user[rankingProp];

  if (!score || score < 5) {
    throw new InvalidScoreError();
  }

  const { country, snapshots } = user;

  if (context === BadgeContext.Country && !country) {
    throw new InvalidCountryError();
  }

  const rankings = user[context === BadgeContext.Country ? 'rankCountry' : 'rankGlobal'];
  const position = rankings?.[rankingProp];

  if (!rankings || !position) {
    throw new RanksAreNotAvailableError();
  }

  const { tiers, rankedCount } = await fetchTiers(params, country);

  let tierData: ProfileTierType | undefined;
  if (tiers && rankedCount) {
    tierData = getRankingTierData(rankingProp, rankings, rankedCount, tiers);
  }

  const latestSnapshot = getLatestSnapshot(snapshots);
  const scoreM = latestSnapshot?.[rankingProp];
  const positionM = rankings?.[`${rankingProp}M`];

  return { country, position, positionM, score, scoreM, tiers, tierData };
};
