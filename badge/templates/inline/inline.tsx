import { FC } from 'react';

import { getContainerStyles, getLabelStyles, getMetaStyles, getValueStyles } from './inline.styles';
import { BadgeInlineProps } from './inline.types';

export const BadgeInline: FC<BadgeInlineProps> = ({ label, value, meta, cornerStyle, labelBgColor, valueBgColor }) => {
  return (
    <div style={getContainerStyles(cornerStyle)}>
      {label && <div style={getLabelStyles(labelBgColor)}>{label}</div>}
      <div style={getValueStyles(valueBgColor)}>{value}</div>
      {meta && <div style={getMetaStyles(valueBgColor)}>{meta}</div>}
    </div>
  );
};
