import { FC } from 'react';

import { CONTAINER, LEFT_BLOCK, RIGHT_BLOCK } from './inline.styles';
import { BadgeInlineProps } from './inline.types';

export const BadgeInline: FC<BadgeInlineProps> = ({ label, value, meta }) => {
  return (
    <div style={CONTAINER}>
      {label && <span style={LEFT_BLOCK}>{label}</span>}
      <span style={RIGHT_BLOCK}>{value}</span>
      {meta && <span>{meta}</span>}
    </div>
  );
};
