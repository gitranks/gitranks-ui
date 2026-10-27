import type { CSSProperties, FC, ReactNode } from 'react';

import {
  LOCKUP_HEIGHT,
  LOCKUP_MARK_TRANSFORM,
  LOCKUP_WIDTH,
  LOCKUP_WORDMARK_PATH,
  MARK_STAR_PATH,
  MARK_VIEW_BOX,
} from './logo.consts';
import { cn } from '@/lib/utils';

/**
 * `auto` follows the site theme (the `dark` class), `light` and `dark` are for a known background, `mono` draws
 * everything in `currentColor`.
 */
export type LogoTheme = 'auto' | 'light' | 'dark' | 'mono';

type LogoColors = { podium: string; star: string; wordmark: string };

const COLORS: Record<LogoTheme, LogoColors> = {
  auto: {
    podium: 'fill-[#7f22fe] dark:fill-[#a684ff]',
    star: 'fill-[#f59e0b] stroke-[#f59e0b] dark:fill-[#ffb900] dark:stroke-[#ffb900]',
    wordmark: 'fill-[#18181b] dark:fill-[#fafafa]',
  },
  light: {
    podium: 'fill-[#7f22fe]',
    star: 'fill-[#f59e0b] stroke-[#f59e0b]',
    wordmark: 'fill-[#18181b]',
  },
  dark: {
    podium: 'fill-[#a684ff]',
    star: 'fill-[#ffb900] stroke-[#ffb900]',
    wordmark: 'fill-[#fafafa]',
  },
  mono: {
    podium: 'fill-current',
    star: 'fill-current stroke-current',
    wordmark: 'fill-current',
  },
};

type LogoProps = {
  theme?: LogoTheme;
  className?: string;
  /** Names the logo for screen readers; leave it off when "GitRanks" is written next to it. */
  labelled?: boolean;
};

const MarkShapes: FC<{ colors: LogoColors }> = ({ colors }) => (
  <>
    <rect x="5" y="27" width="11.5" height="16" rx="2.2" fillOpacity=".55" className={colors.podium} />
    <rect x="18.25" y="21" width="11.5" height="22" rx="2.2" className={colors.podium} />
    <rect x="31.5" y="31" width="11.5" height="12" rx="2.2" fillOpacity=".35" className={colors.podium} />
    <path d={MARK_STAR_PATH} strokeWidth="1.4" strokeLinejoin="round" className={colors.star} />
  </>
);

type LogoSvgProps = {
  viewBox: string;
  className?: string;
  style?: CSSProperties;
  labelled: boolean;
  children: ReactNode;
};

const LogoSvg: FC<LogoSvgProps> = ({ viewBox, className, style, labelled, children }) =>
  labelled ? (
    <svg viewBox={viewBox} className={cn('shrink-0', className)} style={style} role="img">
      <title>GitRanks</title>
      {children}
    </svg>
  ) : (
    <svg viewBox={viewBox} className={cn('shrink-0', className)} style={style} aria-hidden="true">
      {children}
    </svg>
  );

/** The podium star alone, on its 48 grid (square). */
export const LogoMark: FC<LogoProps> = ({ theme = 'auto', className, labelled = true }) => (
  <LogoSvg viewBox={MARK_VIEW_BOX} className={className} labelled={labelled}>
    <MarkShapes colors={COLORS[theme]} />
  </LogoSvg>
);

/** The mark and the "gitranks" wordmark. Size it by height; the width follows. */
export const Logo: FC<LogoProps> = ({ theme = 'auto', className, labelled = true }) => {
  const colors = COLORS[theme];

  return (
    <LogoSvg
      viewBox={`0 0 ${LOCKUP_WIDTH} ${LOCKUP_HEIGHT}`}
      className={cn('w-auto', className)}
      style={{ aspectRatio: `${LOCKUP_WIDTH} / ${LOCKUP_HEIGHT}` }}
      labelled={labelled}
    >
      <g transform={LOCKUP_MARK_TRANSFORM}>
        <MarkShapes colors={colors} />
      </g>
      <path d={LOCKUP_WORDMARK_PATH} className={colors.wordmark} />
    </LogoSvg>
  );
};
