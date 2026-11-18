import { CircleDot } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { type ArchiveHero, formatCompactCount, formatFullCount, formatMonthYear, heroAnchorOf } from '../archive';
import { StarOnGitHub } from './star-on-github';
import { GithubAvatar } from '@/app/components/landing/landing-ui';
import { Button } from '@/components/ui/button';
import { heroWeekLabel } from '@/lib/unsung-hero/unsung-hero';
import { cn } from '@/lib/utils';
import { getRepoPath } from '@/utils/repo-paths';

/** Where "Find an issue to fix" goes: issues picked for you to work on. */
const CONTRIBUTE_PATH = '/contribute' as Route;

const avatarOf = (nameWithOwner: string) =>
  `https://avatars.githubusercontent.com/${encodeURIComponent(nameWithOwner.split('/')[0])}`;

/** One number and what it counts; `dd` drawn above its `dt`. */
export function Figure({
  value,
  label,
  positive = false,
  className,
}: Readonly<{ value: string; label: string; positive?: boolean; className?: string }>) {
  return (
    <div className="flex flex-col-reverse justify-end gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('m-0 font-mono text-2xl font-semibold tabular-nums', positive && 'text-positive', className)}>
        {value}
      </dd>
    </div>
  );
}

/** A count inside a sentence. */
const Count = ({ children }: Readonly<{ children: ReactNode }>) => (
  <span className="font-mono text-foreground tabular-nums">{children}</span>
);

type HeroThisWeekProps = {
  hero: ArchiveHero;
  /** Count a press of Star on GitHub; false in a maintainer's preview. */
  report?: boolean;
  /** The section's heading id: one per page. */
  headingId?: string;
};

/**
 * "This week" on the archive: the week, the repository with its maintainer and age, what it does, a link to star it
 * and one to find an issue to fix, and its figures (three when its contributors are not known).
 */
export function HeroThisWeek({ hero, report = true, headingId = 'this-week' }: Readonly<HeroThisWeekProps>) {
  const { nameWithOwner } = hero.repo;
  const maintainer = hero.maintainer.name || hero.maintainer.login;
  const since = hero.repo.createdAt ? ` · since ${formatMonthYear(hero.repo.createdAt)}` : '';

  return (
    <section
      aria-labelledby={headingId}
      id={heroAnchorOf(nameWithOwner)}
      className="flex scroll-mt-4 flex-col gap-5 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6 dark:shadow-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          This week
        </h2>
        <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-positive-strong">
          {heroWeekLabel(hero)} · live
        </span>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <Link
            href={getRepoPath(nameWithOwner)}
            prefetch={false}
            className="flex min-w-0 items-center gap-3 hover:underline"
          >
            <GithubAvatar url={avatarOf(nameWithOwner)} size={44} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{nameWithOwner}</span>
              <span className="truncate text-sm text-muted-foreground">
                {maintainer}
                {since}
              </span>
            </span>
          </Link>
          <p className="max-w-[60ch] text-muted-foreground">{hero.text}</p>
          <div className="flex flex-wrap gap-3">
            <StarOnGitHub nameWithOwner={nameWithOwner} report={report} />
            <Button variant="outline" asChild className="max-sm:min-h-11">
              <Link href={CONTRIBUTE_PATH} prefetch={false}>
                <CircleDot aria-hidden="true" />
                Find an issue to fix
              </Link>
            </Button>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-2 content-start gap-4">
          <Figure value={formatCompactCount(hero.weeklyDownloads)} label="downloads a week" />
          {hero.starsAtStart !== null && (
            <Figure value={formatFullCount(hero.starsAtStart)} label="stars when featured" />
          )}
          <Figure value={`+${formatFullCount(hero.starsGained)}`} label="stars since Monday" positive />
          {hero.contributors !== null && <Figure value={formatFullCount(hero.contributors)} label="contributors" />}
        </dl>
      </div>
    </section>
  );
}

/** One past hero: its week, name, line and figures when featured, and the stars that week and now. */
export function PastHeroRow({ hero }: Readonly<{ hero: ArchiveHero }>) {
  const { nameWithOwner } = hero.repo;
  return (
    <li
      id={heroAnchorOf(nameWithOwner)}
      className="grid scroll-mt-4 grid-cols-[minmax(0,1fr)_auto] gap-3 border-t py-4"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs text-muted-foreground">{heroWeekLabel(hero)}</span>
        <Link
          href={getRepoPath(nameWithOwner)}
          prefetch={false}
          className="flex min-w-0 items-center gap-2 font-medium hover:underline"
        >
          <GithubAvatar url={avatarOf(nameWithOwner)} size={20} />
          <span className="truncate">{nameWithOwner}</span>
        </Link>
        <span className="text-sm text-muted-foreground">{hero.line}</span>
        <span className="text-xs text-muted-foreground">
          <Count>{formatCompactCount(hero.weeklyDownloads)}</Count> downloads a week
          {hero.starsAtStart !== null && (
            <>
              {' · '}
              <Count>{formatFullCount(hero.starsAtStart)}</Count> stars when featured
            </>
          )}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className="font-mono text-xl font-semibold text-positive tabular-nums">
          +{formatFullCount(hero.starsGained)}
        </span>
        <span className="text-xs text-muted-foreground">stars that week</span>
        {hero.starsNow !== null && (
          <span className="text-xs text-muted-foreground">
            now <Count>{formatFullCount(hero.starsNow)}</Count>
          </span>
        )}
      </div>
    </li>
  );
}
