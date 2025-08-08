import {
  BORDER_RADIUS,
  BOX_SHADOW,
  FONT_SCALE,
  FONT_SIZE,
  INLINE_BADGE_HEIGHT,
  PADDING_EDGE,
  PADDING_SIDE,
} from './inline.consts';

export const CONTAINER = {
  display: 'flex',
  fontWeight: 400,
  fontSize: FONT_SIZE,
  height: INLINE_BADGE_HEIGHT,
  borderRadius: BORDER_RADIUS,
  overflow: 'hidden',
  letterSpacing: '-0.014em',
};

export const LEFT_BLOCK = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#5c5c5c',
  color: 'white',
  padding: `0 ${PADDING_SIDE}px 0 ${PADDING_EDGE}px`,
  fontSize: `${FONT_SCALE}em`,
  textShadow: BOX_SHADOW,
};

export const RIGHT_BLOCK = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#2282c2',
  color: 'white',
  padding: `0 ${PADDING_EDGE}px 0 ${PADDING_SIDE}px`,
  fontSize: `${FONT_SCALE}em`,
  textShadow: BOX_SHADOW,
};
