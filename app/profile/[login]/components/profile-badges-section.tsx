'use client';

import type { Route } from 'next';
import type { FC, MouseEvent } from 'react';
import { toast } from 'sonner';

import { MoreLink, ProfileCard, ProfileCardHeader } from './profile-card';
import {
  type CanonicalBadgeVariant,
  getCanonicalBadgePath,
  getCanonicalBadgeTitle,
  getCanonicalBadgeUrl,
  isCanonicalBadgeAvailable,
} from '@/badge/canonical-badge';
import type { RankingRanks, RankingScores } from '@/badge/utils/is-ranked-in';

const BADGE_COLUMNS: [CanonicalBadgeVariant, CanonicalBadgeVariant][] = [
  ['stars-rank', 'stars-score'],
  ['contributions-rank', 'contributions-score'],
  ['followers-rank', 'followers-score'],
];

type ProfileBadgesSectionProps = {
  login: string;
  scores: RankingScores;
  /** Global ranks: badges are global whichever tab the profile is on. */
  ranks: RankingRanks;
};

export const ProfileBadgesSection: FC<ProfileBadgesSectionProps> = ({ login, scores, ranks }) => {
  // Badges exist only for the rankings this profile is in; the rest would be broken images.
  const columns = BADGE_COLUMNS.filter(([rankVariant]) => isCanonicalBadgeAvailable(rankVariant, scores, ranks));
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

  if (!columns.length) {
    return null;
  }

  return (
    <ProfileCard className="gap-3">
      <div className="flex items-start justify-between gap-x-4 gap-y-1 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <ProfileCardHeader>Badges</ProfileCardHeader>
          <p className="text-sm text-muted-foreground">
            Embed {login}&apos;s GitRanks badges on GitHub, your site, or social media. Click a badge to copy its image
            URL.
          </p>
        </div>
        <MoreLink href={builderHref} className="shrink-0">
          Customize in badge builder
        </MoreLink>
      </div>

      <div className="flex flex-wrap gap-3">
        {columns.map(([rankVariant, scoreVariant]) => (
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
    </ProfileCard>
  );
};
