import { FC } from 'react';
import { BadgeIcon } from '@/components/badge-icon/badge-icon';
import { figmaVariables } from '@/badge/utils/figma-variables-mapping';
import { BadgeMediumProps } from './medium.types';
import { getRankByType } from '@/badge/utils/get-rank-by-type';
import { getTitleByType } from '@/badge/utils/get-title-by-type';
import { BadgeType } from '@/badge/badge.types';
import { containerStyles, metaItemStyles, rankDeltaStyles, rankStyles, subtitleStyles } from './medium.styles';
import { getUsersBehindMe } from '@/badge/utils/users-behind-me';

const getSubtitleByType = (type: BadgeType) => {
  switch (type) {
    case 'stars':
      return 'based on stars from repos owned by the user';
    case 'contributions':
      return 'based on stars from repos the user contributed to';
    case 'followers':
      return 'based on the number of followers the user has';
  }
};

export const BadgeMedium: FC<BadgeMediumProps> = ({ theme, type, data }) => {
  const { colors } = figmaVariables[theme];

  const { rank, delta = 0, value, sentiment } = getRankByType(data, type);
  const title = getTitleByType(type);
  const subtitle = getSubtitleByType(type);

  if (!rank || !sentiment) {
    return null;
  }

  const entityName = type === 'followers' ? 'followers' : 'stars';

  return (
    <div
      style={{
        ...containerStyles,
        color: colors.text.primary,
        backgroundColor: colors.surface.primary,
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <BadgeIcon type={type} size={32} />
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
          <div style={subtitleStyles}>total {entityName}</div>
          <div style={{ display: 'flex', fontSize: 14, fontWeight: 600 }}>
            {(!value ? 0 : value).toLocaleString('en-US')}
          </div>
        </div>
      </div>
    </div>
  );
};
