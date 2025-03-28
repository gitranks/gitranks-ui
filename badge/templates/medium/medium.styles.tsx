import { MEDIUM_BADGE_HEIGHT, MEDIUM_BADGE_WIDTH } from './medium.consts';

export const containerStyles = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 16,
  padding: 16,
  fontFamily: 'Inter',
  width: MEDIUM_BADGE_WIDTH,
  height: MEDIUM_BADGE_HEIGHT,
  borderRadius: 8,
} as const;

export const rankStyles = {
  display: 'flex',
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: 24,
  fontWeight: 700,
} as const;

export const metaItemStyles = {
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export const subtitleStyles = { display: 'flex', fontSize: 10, fontWeight: 400 };

export const rankDeltaStyles = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: 14,
  fontWeight: 600,
} as const;
