'use client';

import type { Route } from 'next';
import type { FC, MouseEvent } from 'react';
import { toast } from 'sonner';

import {
  type CanonicalBadgeVariant,
  getCanonicalBadgePath,
  getCanonicalBadgeTitle,
  getCanonicalBadgeUrl,
} from '@/badge/canonical-badge';
import { Link as LinkUnderlined } from '@/components/link/link';

const BADGE_COLUMNS: [CanonicalBadgeVariant, CanonicalBadgeVariant][] = [
  ['stars-rank', 'stars-score'],
  ['contributions-rank', 'contributions-score'],
  ['followers-rank', 'followers-score'],
];

type ProfileBadgesSectionProps = {
  login: string;
};

export const ProfileBadgesSection: FC<ProfileBadgesSectionProps> = ({ login }) => {
  const builderHref = `/badge/builder/${encodeURIComponent(login)}` as Route;

  const copySvgUrl = async (variant: CanonicalBadgeVariant) => {
    const url = getCanonicalBadgeUrl(login, variant, 'svg', window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Image link copied');
    } catch {
      toast.error('Could not copy image link');
    }
  };

  const onBadgeClick = (event: MouseEvent<HTMLAnchorElement>, variant: CanonicalBadgeVariant) => {
    // Unmodified primary click copies the SVG embed URL; modified clicks keep normal link behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    void copySvgUrl(variant);
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-4 rounded-xl border-1 mt-8">
      <div className="flex items-start justify-between gap-x-4 gap-y-1 flex-wrap text-sm">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div>Embed {login}&apos;s GitRanks badges on GitHub, your site, or social media</div>
          <div className="text-muted-foreground">
            Click a badge to copy its image URL, or open the badge builder to customize it.
          </div>
        </div>
        <LinkUnderlined className="flex items-center gap-2 shrink-0" href={builderHref}>
          Customize in badge builder
        </LinkUnderlined>
      </div>

      <div className="flex flex-wrap gap-3">
        {BADGE_COLUMNS.map(([rankVariant, scoreVariant]) => (
          <div key={rankVariant} className="flex flex-col gap-2">
            {([rankVariant, scoreVariant] as const).map((variant) => {
              const title = getCanonicalBadgeTitle(variant);
              // Display the SVG: no resvg rasterization per page view, and it stays sharp.
              // The PNG variant exists for the sitemap image extension / Image Search.
              const svgPath = getCanonicalBadgePath(login, variant, 'svg');
              return (
                <a
                  key={variant}
                  href={svgPath}
                  onClick={(event) => onBadgeClick(event, variant)}
                  className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:opacity-90 transition-opacity"
                  title={`Copy ${title} embed URL`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic badge endpoint */}
                  <img src={svgPath} alt={`${login} · ${title} · GitRanks`} height={20} className="h-5 w-auto" />
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
