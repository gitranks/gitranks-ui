import type { FC } from 'react';

import { TIER_ICON_GAP, TIER_ICON_SIZE } from './inline.consts';
import { getContainerStyles, getLabelStyles, getMetaStyles, getValueStyles } from './inline.styles';
import type { BadgeInlineProps } from './inline.types';
import { tierIconShapes } from '@/components/tier-icon/tier-icon';

export const BadgeInline: FC<BadgeInlineProps> = ({
  label,
  value,
  valueTier,
  meta,
  cornerStyle,
  labelBgColor,
  valueBgColor,
}) => {
  return (
    <div style={getContainerStyles(cornerStyle)}>
      {label && <div style={getLabelStyles(labelBgColor)}>{label}</div>}
      <div style={getValueStyles(valueBgColor)}>
        {valueTier && (
          <svg
            width={TIER_ICON_SIZE}
            height={TIER_ICON_SIZE}
            viewBox="0 0 48 48"
            aria-hidden="true"
            style={{ marginRight: TIER_ICON_GAP, flexShrink: 0 }}
          >
            {tierIconShapes(valueTier)}
          </svg>
        )}
        {value}
      </div>
      {meta && <div style={getMetaStyles(valueBgColor)}>{meta}</div>}
    </div>
  );
};
