'use client';

import { type FC, useId } from 'react';

import { REPO_TIER_NAMES } from '@/app/app.consts';
import { cn } from '@/lib/utils';

type RepoTierIconProps = {
  /** 1 (Stardust) to 7 (Supernova). */
  tier: number;
  /** `large` (48 grid) for the rank card; `small` (24 grid, fewer parts) from 32px down to 14px. */
  variant?: 'large' | 'small';
  className?: string;
  /** Names the tier for screen readers; leave it off when the tier name is written next to the icon. */
  labelled?: boolean;
};

/** The glyph of a repository tier, drawn in `currentColor`: dust, comet, moon, planet, nova, galaxy, supernova. */
export const RepoTierIcon: FC<RepoTierIconProps> = ({ tier, variant = 'small', className, labelled = false }) => {
  const id = useId();
  const large = variant === 'large';
  const viewBox = large ? '0 0 48 48' : '0 0 24 24';
  const glyph = large ? <LargeGlyph tier={tier} id={id} /> : <SmallGlyph tier={tier} id={id} />;

  return labelled ? (
    <svg viewBox={viewBox} fill="currentColor" className={cn('shrink-0', className)} role="img">
      <title>{REPO_TIER_NAMES[tier - 1]}</title>
      {glyph}
    </svg>
  ) : (
    <svg viewBox={viewBox} fill="currentColor" className={cn('shrink-0', className)} aria-hidden="true">
      {glyph}
    </svg>
  );
};

const LargeGlyph: FC<{ tier: number; id: string }> = ({ tier, id }) => {
  switch (tier) {
    case 1:
      return (
        <>
          <circle cx="13" cy="15" r="3" />
          <circle cx="31" cy="11" r="2" />
          <circle cx="37" cy="27" r="3.5" />
          <circle cx="19" cy="32" r="2.5" />
          <circle cx="10" cy="39" r="1.5" />
          <circle cx="31" cy="39" r="2" />
          <path d="M24 15c.8 3.6 2.6 5.4 6 6-3.4.6-5.2 2.4-6 6-.8-3.6-2.6-5.4-6-6 3.4-.6 5.2-2.4 6-6z" />
        </>
      );
    case 2:
      return (
        <>
          <path d="M27 11L37 21L7 41Z" fillOpacity=".3" />
          <path d="M29.5 13.5L34.5 18.5L15 34Z" fillOpacity=".6" />
          <circle cx="32" cy="16" r="7" />
        </>
      );
    case 3:
      return (
        <>
          <mask id={`${id}-moon`}>
            <rect width="48" height="48" fill="white" />
            <circle cx="31" cy="17" r="13" fill="black" />
          </mask>
          <circle cx="21" cy="26" r="16" mask={`url(#${id}-moon)`} />
          <circle cx="37" cy="33" r="1.6" />
          <circle cx="41" cy="25" r="1" />
        </>
      );
    case 4:
      return (
        <>
          <mask id={`${id}-ring`}>
            <rect width="48" height="48" fill="white" />
            <path d="M4 30.5A21 6.5 -18 0 0 44 17.5" fill="none" stroke="black" strokeWidth="7" />
          </mask>
          <ellipse
            cx="24"
            cy="24"
            rx="21"
            ry="6.5"
            transform="rotate(-18 24 24)"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <circle cx="24" cy="24" r="11" mask={`url(#${id}-ring)`} />
          <path d="M4 30.5A21 6.5 -18 0 0 44 17.5" fill="none" stroke="currentColor" strokeWidth="3" />
        </>
      );
    case 5:
      return (
        <>
          <circle cx="24" cy="24" r="11" fillOpacity=".2" />
          <circle cx="24" cy="24" r="6" />
          <g stroke="currentColor" strokeLinecap="round">
            <path d="M24 4v10M24 34v10M4 24h10M34 24h10" strokeWidth="3" />
            <path d="M10 10l5 5M33 33l5 5M38 10l-5 5M15 33l-5 5" strokeWidth="2.5" />
          </g>
        </>
      );
    case 6:
      return (
        <>
          <g fill="none" stroke="currentColor" strokeLinecap="round">
            <path d="M24 24C30 14 42 17 41 28" strokeWidth="3.5" />
            <path d="M24 24C18 34 6 31 7 20" strokeWidth="3.5" />
            <path d="M41 28C39 37 29 41 20 38" strokeWidth="2.5" strokeOpacity=".45" />
            <path d="M7 20C9 11 19 7 28 10" strokeWidth="2.5" strokeOpacity=".45" />
          </g>
          <circle cx="24" cy="24" r="4.5" />
          <circle cx="38" cy="11" r="1.3" />
          <circle cx="10" cy="37" r="1.3" />
        </>
      );
    default:
      return (
        <>
          <circle cx="24" cy="24" r="19.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity=".45" />
          <path d="M33.9 14.1L26.6 24L33.9 33.9L24 26.6L14.1 33.9L21.4 24L14.1 14.1L24 21.4Z" fillOpacity=".5" />
          <path d="M24 3L28 20L45 24L28 28L24 45L20 28L3 24L20 20Z" />
          <circle cx="24" cy="24" r="3" fill="white" fillOpacity=".85" />
        </>
      );
  }
};

const SmallGlyph: FC<{ tier: number; id: string }> = ({ tier, id }) => {
  switch (tier) {
    case 1:
      return (
        <>
          <circle cx="6.5" cy="8" r="2" />
          <circle cx="17.5" cy="16" r="2.5" />
          <circle cx="8" cy="18.5" r="1.5" />
          <path d="M15 3.5c.5 2.3 1.6 3.4 4 4-2.4.6-3.5 1.7-4 4-.5-2.3-1.6-3.4-4-4 2.4-.6 3.5-1.7 4-4z" />
        </>
      );
    case 2:
      return (
        <>
          <path d="M13.5 5.5L18.5 10.5L3.5 20.5Z" fillOpacity=".45" />
          <circle cx="16" cy="8" r="3.8" />
        </>
      );
    case 3:
      return (
        <>
          <mask id={`${id}-moon`}>
            <rect width="24" height="24" fill="white" />
            <circle cx="15.5" cy="8.5" r="6.5" fill="black" />
          </mask>
          <circle cx="10.5" cy="13" r="8" mask={`url(#${id}-moon)`} />
        </>
      );
    case 4:
      return (
        <>
          <mask id={`${id}-ring`}>
            <rect width="24" height="24" fill="white" />
            <path d="M2 15.2A10.5 3.3 -18 0 0 22 8.8" fill="none" stroke="black" strokeWidth="3.6" />
          </mask>
          <ellipse
            cx="12"
            cy="12"
            rx="10.5"
            ry="3.3"
            transform="rotate(-18 12 12)"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="5.5" mask={`url(#${id}-ring)`} />
          <path d="M2 15.2A10.5 3.3 -18 0 0 22 8.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </>
      );
    case 5:
      return (
        <>
          <circle cx="12" cy="12" r="3.4" />
          <path
            d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.4"
          />
        </>
      );
    case 6:
      return (
        <>
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4">
            <path d="M12 12C15 7 21 8.5 20.5 14" />
            <path d="M12 12C9 17 3 15.5 3.5 10" />
          </g>
          <circle cx="12" cy="12" r="2.8" />
        </>
      );
    default:
      return <path d="M12 1.5L14.3 9.7L22.5 12L14.3 14.3L12 22.5L9.7 14.3L1.5 12L9.7 9.7Z" />;
  }
};
