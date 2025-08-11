import satori from 'satori';

import { TIER_NAMES } from '@/app/app.consts';
import {
  InvalidCountryError,
  InvalidScoreError,
  NotFoundError,
  RanksAreNotAvailableError,
  TiersAreNotAvailableError,
} from '@/badge/badge.errors';
import { badgeDataLoader } from '@/badge/badge.loader';
import { BadgeFetchedData, BadgeV2ServiceProps, BadgeV2Params } from '@/badge/badge.types';
import { getSatoriConfig } from '@/badge/utils/get-satori-config';
import { RankMeta, RankType } from '@/types/badge.types';
import { getNextTierThreshold } from '@/utils/get-next-tier-threshold';
import { getPercentileRank } from '@/utils/get-percentile-rank';

import { BadgeInline } from './inline';
import { INLINE_BADGE_HEIGHT, TOP_PERCENTILE_TIER_IDX } from './inline.consts';

const getBadgeLabel = (params: BadgeV2Params) => {
  return params.label;
};

const getBadgeValue = (params: BadgeV2Params, data: BadgeFetchedData) => {
  const { type } = params;
  const { position, score, tierData } = data;

  switch (type) {
    case RankType.Position:
      return `#${position.toLocaleString('en-US')}`;
    case RankType.Tier: {
      if (!tierData || tierData.notAvailable) {
        return 'N/A';
      }

      if (tierData.notRanked || !tierData.data) {
        return 'Not Ranked';
      }

      return `${TIER_NAMES[tierData.data.tier - 1]} ${tierData.data.level}`;
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
    let delta: number | undefined;
    switch (type) {
      case RankType.Position:
        if (positionM && positionM !== position) {
          delta = positionM - position;
        }
        break;
      case RankType.Score:
        if (scoreM && scoreM !== score) {
          delta = score - scoreM;
        }
        break;
    }

    if (delta) {
      return `${delta > 0 ? '+' : ''}${delta.toLocaleString('en-US')} this month`;
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
      return `★${threshold} to ${TIER_NAMES[nextTier.tier]} ${nextTier.level}`;
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
      return `★${threshold.toLocaleString('en-US')} to ${metaInfo.label}`;
    }
  }
};

const getBadgeParts = (params: BadgeV2Params, data: BadgeFetchedData) => {
  const label = getBadgeLabel(params);
  const value = getBadgeValue(params, data);
  const meta = getBadgeMeta(params, data);

  return { label, value, meta };
};

const getTextByParams = async ({ login, params }: BadgeV2ServiceProps) => {
  try {
    const data = await badgeDataLoader(login, params);

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

export async function renderInlineBadge(props: BadgeV2ServiceProps) {
  const { labelBgColor, valueBgColor, cornerStyle } = props.params;

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
    <BadgeInline
      label={label}
      value={value}
      meta={meta}
      labelBgColor={labelBgColor}
      valueBgColor={valueBgColor}
      cornerStyle={cornerStyle}
    />,
    await getSatoriConfig({
      fontOptions: [{ name: 'Verdana', weight: 400 }],
      height: INLINE_BADGE_HEIGHT,
    }),
  );
}
