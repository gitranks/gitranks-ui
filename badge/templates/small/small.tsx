import { FC } from 'react';

import { figmaVariables } from '@/badge/utils/figma-variables-mapping';
import { getRankByRankingType } from '@/badge/utils/get-rank-by-ranking-type';
import { getTitleByRankingType } from '@/badge/utils/get-title-by-ranking-type';
import { BadgeIcon } from '@/components/badge-icon/badge-icon';

import { SMALL_BADGE_HEIGHT, SMALL_BADGE_WIDTH } from './small.consts';
import { BadgeSmallProps } from './small.types';

export const BadgeSmall: FC<BadgeSmallProps> = ({ theme, rankingType, data }) => {
  const { colors } = figmaVariables[theme];

  const { rank, delta, sentiment } = getRankByRankingType(data, rankingType);
  const title = getTitleByRankingType(rankingType);

  if (!rank || !sentiment) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 8,
        color: colors.text.primary,
        backgroundColor: colors.surface.primary,
        fontFamily: 'Inter',
        width: SMALL_BADGE_WIDTH,
        height: SMALL_BADGE_HEIGHT,
        borderRadius: 8,
      }}
    >
      <BadgeIcon rankingType={rankingType} size={32} />

      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 400, fontSize: 11, letterSpacing: '0.5px' }}>{title}</div>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{rank.toLocaleString('en-US')}</div>
      </div>

      {!!delta && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: 400,
            fontSize: 8,
            color: colors.text[sentiment],
          }}
        >
          {sentiment === 'positive' && '▲'}
          <div style={{ fontWeight: 700, fontSize: 12 }}>{Math.abs(delta).toLocaleString('en-US')}</div>
          {sentiment === 'negative' && '▼'}
        </div>
      )}
    </div>
  );
};
