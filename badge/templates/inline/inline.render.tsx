import satori from 'satori';

import { getRankingTierData } from '@/app/profile/[login]/utils/calculate-tiers/calculate-tiers';
import { ProfileTierType } from '@/app/profile/[login]/utils/calculate-tiers/calculate-tiers.types';
import { BadgeServiceProps, BadgeV2Params } from '@/badge/badge.types';
import { getLatestSnapshot } from '@/badge/utils/get-latest-snapshot';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RankContext, RankMeta, RankType } from '@/types/badge.types';
import { BadgeProfileWithRanksDocument, BadgeTiersDocument } from '@/types/generated/graphql';
import { getNextTierThreshold } from '@/utils/get-next-tier-threshold';
import { getPercentileRank } from '@/utils/get-percentile-rank';

import { BadgeInline } from './inline';
import { INLINE_BADGE_HEIGHT, TOP_PERCENTILE_TIER_IDX } from './inline.consts';
import { BadgeFetchedData } from './inline.types';

const BADGE_TYPES_TO_LOAD_TIERS = [RankType.Percentile, RankType.Tier];

const BADGE_META_TO_LOAD_TIERS = [
  RankMeta.Percentile,
  RankMeta.GoalNextTier,
  RankMeta.GoalTop1,
  RankMeta.GoalTop10,
  RankMeta.GoalTop25,
];

const fetchProfileWithRanks = async (login: string, context: RankContext) => {
  const { user } = await graphqlDirect(BadgeProfileWithRanksDocument, {
    login,
    includeRankGlobal: context === RankContext.Global,
    includeRankCountry: context === RankContext.Country,
  });

  return user;
};

const fetchTiers = async (params: BadgeV2Params, country?: string | null) => {
  const { ranking: rankingProp, context, meta, type } = params;

  if (!BADGE_META_TO_LOAD_TIERS.includes(meta) && !BADGE_TYPES_TO_LOAD_TIERS.includes(type)) {
    return {};
  }

  const tiersName = context === RankContext.Global ? 'global' : country!;

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

class NotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class InvalidScoreError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidScoreError';
  }
}

class InvalidCountryError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidCountryError';
  }
}

class RanksAreNotAvailableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'RanksAreNotAvailableError';
  }
}

class TiersAreNotAvailableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TiersAreNotAvailableError';
  }
}

const loadBadgeData = async (login: string, params: BadgeV2Params): Promise<BadgeFetchedData> => {
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

  if (context === RankContext.Country && !country) {
    throw new InvalidCountryError();
  }

  const rankings = user[context === RankContext.Country ? 'rankCountry' : 'rankGlobal'];
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

const getBadgeLabel = (params: BadgeV2Params) => {
  return params.label;
};

const getBadgeValue = (params: BadgeV2Params, data: BadgeFetchedData) => {
  const { type } = params;
  const { position, score, tierData } = data;

  switch (type) {
    case RankType.Position:
      return position.toLocaleString('en-US');
    case RankType.Tier: {
      if (!tierData || tierData.notAvailable) {
        return 'N/A';
      }

      if (tierData.notRanked) {
        return 'Not Ranked';
      }

      return `${tierData.data?.tier} ${tierData.data?.level}`;
    }
    case RankType.Percentile: {
      const rankPercentile = getPercentileRank(position, tierData?.rankedCount ?? 0);
      if (rankPercentile) {
        return `Top ${rankPercentile}%`;
      }

      return 'N/A';
    }
    case RankType.Score:
    default:
      return score.toLocaleString('en-US');
  }
};

const getBadgeMeta = (params: BadgeV2Params, data: BadgeFetchedData) => {
  const { type, meta } = params;
  const { position, positionM, score, scoreM, tierData, tiers } = data;

  if (meta === RankMeta.None) {
    return;
  }

  if (meta === RankMeta.MonthlyChange) {
    if (type === RankType.Position) {
      if (positionM && positionM !== position) {
        const delta = positionM - position;
        return `${delta > 0 ? '+' : ''}${delta.toLocaleString('en-US')}`;
      }
    } else if (type === RankType.Score) {
      if (scoreM && scoreM !== score) {
        const delta = score - scoreM;
        return `${delta > 0 ? '+' : ''}${delta.toLocaleString('en-US')}`;
      }
    }

    return;
  }

  if (meta === RankMeta.Percentile) {
    const rankPercentile = getPercentileRank(position, tierData?.rankedCount ?? 0);

    if (rankPercentile) {
      return `top ${rankPercentile}%`;
    }

    return;
  }

  if (meta === RankMeta.GoalNextTier) {
    if (!tierData) {
      return;
    }

    const { threshold, nextTier } = getNextTierThreshold({ tiers, currentTier: tierData.data, score });

    if (threshold) {
      return `★${threshold} to ${nextTier.tier} ${nextTier.level}`;
    }

    return;
  }

  if ([RankMeta.GoalTop1, RankMeta.GoalTop10, RankMeta.GoalTop25].includes(meta)) {
    const metaInfo = TOP_PERCENTILE_TIER_IDX[meta];
    const tierData = tiers?.[metaInfo.index];

    if (!tierData) {
      return;
    }

    const threshold = tierData?.minValue - score;

    if (threshold > 0) {
      return `★${threshold} to ${metaInfo.label}`;
    }
  }
};

const getBadgeParts = (params: BadgeV2Params, data: BadgeFetchedData) => {
  const label = getBadgeLabel(params);
  const value = getBadgeValue(params, data);
  const meta = getBadgeMeta(params, data);

  return { label, value, meta };
};

const getTextByParams = async ({ login, params }: BadgeServiceProps) => {
  try {
    const data = await loadBadgeData(login, params);

    return getBadgeParts(params, data);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { error: 'Profile not found. Please check GitHub username.' };
    }

    if (error instanceof InvalidScoreError) {
      return { error: 'Insufficient stars/followers. Please reach 5+ to rank.' };
    }

    if (error instanceof InvalidCountryError) {
      return { error: 'Invalid country. Please update GitHub location and refresh.' };
    }

    if (error instanceof RanksAreNotAvailableError) {
      return { error: 'Ranks unavailable. Visit profile page and ensure ranks are visible.' };
    }

    if (error instanceof TiersAreNotAvailableError) {
      return { error: 'Tiers unavailable. Need 100+ ranked profiles.' };
    }

    return { error: 'Unknown error... Could you please open a GitHub issue?' };
  }
};

export async function renderInlineBadge(props: BadgeServiceProps) {
  const { leftColor, rightColor } = props.params;

  const parts = await getTextByParams(props);

  let label: string | undefined;
  let value: string;
  let meta: string | undefined;

  if ('error' in parts) {
    label = 'ERROR';
    value = parts.error;
  } else {
    label = parts.label;
    value = parts.value;
    meta = parts.meta;
  }

  return satori(
    <BadgeInline label={label} value={value} meta={meta} />,
    await getSatoriConfig({
      fontOptions: [{ name: 'Verdana', weight: 400 }],
      height: INLINE_BADGE_HEIGHT,
    }),
  );
}
