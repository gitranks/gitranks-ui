import { FC } from 'react';

import { figmaVariables } from '@/badge/utils/figma-variables-mapping';
import { getRankByRankingType } from '@/badge/utils/get-rank-by-ranking-type';
import { getTitleByRankingType } from '@/badge/utils/get-title-by-ranking-type';
import { getUsersBehindMe } from '@/badge/utils/users-behind-me';
import { BadgeIcon } from '@/components/badge-icon/badge-icon';
import { RankingType } from '@/types/ranking.types';

import { containerStyles, metaItemStyles, rankDeltaStyles, rankStyles, subtitleStyles } from './medium.styles';
import { BadgeMediumProps } from './medium.types';

const getSubtitleByRankingType = (rankingType: RankingType) => {
  switch (rankingType) {
    case RankingType.Star:
      return 'based on stars from repos owned by the user';
    case RankingType.Contribution:
      return 'based on stars from repos the user contributed to';
    case RankingType.Follower:
      return 'based on the number of followers the user has';
  }
};

export const BadgeMedium: FC<BadgeMediumProps> = ({ theme, rankingType, data }) => {
  const { colors } = figmaVariables[theme];

  const { rank, delta = 0, value, sentiment } = getRankByRankingType(data, rankingType);
  const title = getTitleByRankingType(rankingType);
  const subtitle = getSubtitleByRankingType(rankingType);

  if (!rank || !sentiment) {
    return null;
  }

  const entityName = rankingType === 'follower' ? 'followers' : 'total stars';

  return (
    <div
      style={{
        ...containerStyles,
        color: colors.text.primary,
        backgroundColor: colors.surface.primary,
      }}
    >
      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        <BadgeIcon rankingType={rankingType} size={32} />
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          <div style={subtitleStyles}>{subtitle}</div>
        </div>
      </div>

      <div style={rankStyles}>{rank.toLocaleString('en-US')}</div>

      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ ...metaItemStyles, borderRight: `1px solid ${colors.text.primary}` }}>
          <div style={subtitleStyles}>better than</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{getUsersBehindMe(rank)}</div>
        </div>
        <div style={{ ...metaItemStyles, borderRight: `1px solid ${colors.text.primary}` }}>
          <div style={subtitleStyles}>this month</div>
          <div style={{ ...rankDeltaStyles, color: delta ? colors.text[sentiment] : colors.text.primary }}>
            {delta > 0 ? '+' : ''}
            {delta.toLocaleString('en-US')}
          </div>
        </div>
        <div style={metaItemStyles}>
          <div style={subtitleStyles}>{entityName}</div>
          <div style={{ display: 'flex', fontSize: 14, fontWeight: 600 }}>
            {(!value ? 0 : value).toLocaleString('en-US')}
          </div>
        </div>
      </div>
    </div>
  );
};
