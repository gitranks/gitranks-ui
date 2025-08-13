import { getContrastTextColor, getTextShadow } from '@/badge/utils/get-contrast-text-color';
import { BadgeCornerStyle } from '@/types/badge.types';

import {
  BORDER_RADIUS,
  FONT_SCALE,
  FONT_SIZE,
  INLINE_BADGE_HEIGHT,
  LABEL_BG,
  META_SCALE,
  PADDING_EDGE,
  PADDING_SIDE,
  VALUE_BG,
} from './inline.consts';

export const getContainerStyles = (cornerStyle: BadgeCornerStyle = BadgeCornerStyle.Rounded) => ({
  display: 'flex',
  fontWeight: 400,
  fontSize: FONT_SIZE,
  height: INLINE_BADGE_HEIGHT,
  borderRadius: cornerStyle === BadgeCornerStyle.Rounded ? BORDER_RADIUS : 0,
  overflow: 'hidden',
  letterSpacing: '-0.014em',
});

const getCommonStyles = (backgroundColor: string) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor,
  color: getContrastTextColor(backgroundColor),
  padding: `0 ${PADDING_SIDE}px 0 ${PADDING_EDGE}px`,
  textShadow: getTextShadow(backgroundColor),
});

export const getLabelStyles = (backgroundColor = LABEL_BG) => ({
  ...getCommonStyles(backgroundColor),
  fontSize: `${FONT_SCALE}em`,
});

export const getValueStyles = (backgroundColor = VALUE_BG) => ({
  ...getCommonStyles(backgroundColor),
  fontSize: `${FONT_SCALE}em`,
});

export const getMetaStyles = (backgroundColor = VALUE_BG) => ({
  ...getCommonStyles(backgroundColor),
  opacity: 0.9,
  fontSize: `${META_SCALE}em`,
  borderLeft: '1px solid rgba(255, 255, 255, 0.3)',
});
