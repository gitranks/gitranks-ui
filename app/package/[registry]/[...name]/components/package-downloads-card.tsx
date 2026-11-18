'use client';

import { type FC, useState } from 'react';

import {
  changeText,
  type DownloadsPeriod,
  downloadsPerStar,
  monthPeriodOf,
  weekPeriodOf,
} from '../utils/package-downloads';
import { Sparkline } from './sparkline';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { formatCount } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import type { PackageDownloads } from '@/graphql/package-page';
import { REGISTRIES, type RegistryId } from '@/lib/packages/registries';
import { cn } from '@/lib/utils';

type PackageDownloadsCardProps = {
  /** The registry the package is on: its downloads are counted in its own unit. */
  registry: RegistryId;
  downloads: PackageDownloads;
  /** The repository that publishes it, for the per-star line. */
  repo?: { nameWithOwner: string; stars: number } | null;
};

const PERIODS = [
  ['week', 'Week'],
  ['month', 'Month'],
] as const;

const Period: FC<{ period: DownloadsPeriod }> = ({ period }) => (
  <div className="flex flex-col gap-2">
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{formatCount(period.total)}</span>
      <span className="text-sm text-muted-foreground">{period.label}</span>
    </p>
    {period.changes.length > 0 && (
      <p className="flex flex-wrap gap-x-3 text-sm">
        {period.changes.map(({ change, against }) => (
          <span key={against}>
            <span
              className={cn('font-mono tabular-nums', {
                'text-positive': change > 0,
                'text-negative': change < 0,
              })}
            >
              {changeText(change)}
            </span>{' '}
            <span className="text-muted-foreground">{against}</span>
          </span>
        ))}
      </p>
    )}
    <Sparkline values={period.series.map(({ downloads }) => downloads)} className="h-10 w-full" />
  </div>
);

/**
 * The package's downloads from its registry: the 7 days to the last day counted, or the last whole month, each against the
 * period before and a year before, with a small line; and its downloads a week per star of its repository.
 */
export const PackageDownloadsCard: FC<PackageDownloadsCardProps> = ({ registry, downloads, repo }) => {
  const unit = REGISTRIES[registry].downloads;
  const month = monthPeriodOf(downloads);
  const [picked, setPicked] = useState<'week' | 'month'>('week');
  const view = picked === 'month' && month ? 'month' : 'week';
  const period = view === 'month' && month ? month : weekPeriodOf(downloads);
  const perStar = downloadsPerStar(downloads, repo);

  return (
    <ProfileCard className="@container gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Downloads</h2>
        {month && (
          // A fieldset (a group to assistive tech), reset to look like a plain box, as Who builds it's toggle.
          <fieldset aria-label="Downloads period" className="m-0 inline-flex rounded-md border-0 bg-muted p-0.5">
            {PERIODS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setPicked(key)}
                className={cn(
                  'h-7 rounded-sm px-3 text-sm font-semibold',
                  view === key ? 'bg-card shadow-sm' : 'text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </fieldset>
        )}
      </div>
      <Period period={period} />
      {perStar !== null && repo && unit && (
        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formatCount(Math.round(perStar))}</span>
          {` downloads a ${unit} per GitHub star (`}
          <span className="font-mono tabular-nums">{formatCount(repo.stars)}</span> stars on {repo.nameWithOwner}
          ).
        </p>
      )}
    </ProfileCard>
  );
};
