'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type FC, useState } from 'react';

import { builtByTiersText, MIN_SIBLINGS, shareWords } from '../utils/who-builds-it';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { tierLabel } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { getRepoPath } from '@/utils/repo-paths';

type Repo = NonNullable<PageRepoQuery['repo']>;
type Siblings = NonNullable<Repo['siblings']>;
type BuiltBy = NonNullable<Repo['builtBy']>;

type WhoBuildsItCardProps = {
  nameWithOwner: string;
  siblings?: Siblings | null;
  builtBy?: BuiltBy | null;
};

// Literal class names so Tailwind generates them: the developer tier colours (tier-1 … tier-7).
const TIER_BG = ['bg-tier-1', 'bg-tier-2', 'bg-tier-3', 'bg-tier-4', 'bg-tier-5', 'bg-tier-6', 'bg-tier-7'];
const TIER_RING = [
  'ring-tier-1',
  'ring-tier-2',
  'ring-tier-3',
  'ring-tier-4',
  'ring-tier-5',
  'ring-tier-6',
  'ring-tier-7',
];
// Where the siblings sit around the repository in the graph (percent of the box), the closest first.
const SPOTS = [
  { x: 14, y: 18, align: 'items-start' },
  { x: 86, y: 18, align: 'items-end' },
  { x: 14, y: 82, align: 'items-start' },
  { x: 86, y: 82, align: 'items-end' },
] as const;

const percent = (share: number) => `${Math.round(share * 100)}%`;

const SiblingsGraph: FC<{ nameWithOwner: string; siblings: Siblings }> = ({ nameWithOwner, siblings }) => (
  <div className="relative hidden h-48 md:block">
    <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {siblings.slice(0, SPOTS.length).map(({ share, repo }, at) => (
        <line
          key={repo.githubId}
          x1="50"
          y1="50"
          x2={SPOTS[at].x}
          y2={SPOTS[at].y}
          className="stroke-primary"
          strokeOpacity={0.25 + Math.min(share, 1) * 0.6}
          strokeWidth={1.5 + Math.min(share, 1) * 6}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
    <span
      className="absolute top-1/2 left-1/2 max-w-[45%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full bg-foreground px-3 py-1.5 text-sm font-semibold text-background"
      translate="no"
    >
      {nameWithOwner}
    </span>
    {siblings.slice(0, SPOTS.length).map(({ share, repo }, at) => (
      <Link
        key={repo.githubId}
        href={getRepoPath(repo.nameWithOwner)}
        prefetch={false}
        className={cn(
          'absolute flex max-w-[42%] -translate-y-1/2 flex-col rounded-lg border bg-card px-2.5 py-1.5 text-sm hover:underline',
          SPOTS[at].align,
          SPOTS[at].x < 50 ? 'left-0' : 'right-0',
        )}
        style={{ top: `${SPOTS[at].y}%` }}
      >
        <span className="max-w-full truncate font-semibold" translate="no">
          {repo.nameWithOwner}
        </span>
        <span className="font-mono text-xs font-semibold text-primary">{percent(share)} shared</span>
      </Link>
    ))}
  </div>
);

const SiblingsList: FC<{ siblings: Siblings }> = ({ siblings }) => (
  <ol className="flex flex-col gap-2.5 md:hidden">
    {siblings.map(({ share, repo }) => (
      <li key={repo.githubId} className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <Link
            href={getRepoPath(repo.nameWithOwner)}
            prefetch={false}
            className="truncate font-semibold hover:underline"
            translate="no"
          >
            {repo.nameWithOwner}
          </Link>
          <span className="font-mono font-semibold text-primary">{percent(share)}</span>
        </div>
        <div aria-hidden className="h-1.5 rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: percent(Math.min(share, 1)) }} />
        </div>
      </li>
    ))}
  </ol>
);

const SiblingsView: FC<{ nameWithOwner: string; siblings: Siblings }> = ({ nameWithOwner, siblings }) => {
  const [top] = siblings;
  const name = nameWithOwner.split('/')[1] ?? nameWithOwner;

  return (
    <>
      <SiblingsGraph nameWithOwner={nameWithOwner} siblings={siblings} />
      <SiblingsList siblings={siblings} />
      <p className="text-sm">
        {shareWords(top.share)} of the people building {name} also commit to{' '}
        <Link href={getRepoPath(top.repo.nameWithOwner)} prefetch={false} className="font-semibold text-link">
          {top.repo.nameWithOwner}
        </Link>
        .
      </p>
      <p className="text-xs text-muted-foreground">
        Repositories sharing the most contributors active in the last 12 months.
      </p>
    </>
  );
};

const BuiltByView: FC<{ nameWithOwner: string; builtBy: BuiltBy }> = ({ nameWithOwner, builtBy }) => {
  const total = builtBy.counts.reduce((sum, { count }) => sum + count, 0) || 1;
  const more = builtBy.accounts - builtBy.top.length;

  return (
    <>
      <p className="text-[15px] leading-snug">
        <b>{builtByTiersText(builtBy.counts)}</b> built {nameWithOwner.split('/')[1] ?? nameWithOwner} in the last 12
        months.
      </p>
      <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {builtBy.counts.map(({ tier, count }) => (
          <span key={tier} className={TIER_BG[tier - 1]} style={{ width: `${(count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap items-center gap-y-2 pl-1.5">
        {builtBy.top.map(({ login, avatarUrl, tier, level }, at) => (
          <li key={login ?? at} className="-ml-1.5">
            {login ? (
              <Link href={`/profile/${login}`} prefetch={false} title={`${login} · ${tierLabel({ tier, level })}`}>
                <Avatar url={avatarUrl} login={login} tier={tier} />
              </Link>
            ) : (
              <Avatar url={avatarUrl} login="" tier={tier} />
            )}
          </li>
        ))}
        {more > 0 && <li className="ml-2 text-sm text-muted-foreground">+{more.toLocaleString('en-US')} more</li>}
      </ul>
    </>
  );
};

const Avatar: FC<{ url?: string | null; login: string; tier: number }> = ({ url, login, tier }) =>
  url ? (
    <Image
      src={`${url}${url.includes('?') ? '&' : '?'}s=64`}
      alt={login ? `${login} avatar` : ''}
      width={32}
      height={32}
      className={cn('size-8 rounded-full ring-2 ring-offset-2 ring-offset-card', TIER_RING[tier - 1])}
    />
  ) : (
    <span
      className={cn('block size-8 rounded-full bg-muted ring-2 ring-offset-2 ring-offset-card', TIER_RING[tier - 1])}
    />
  );

/**
 * Who builds it: the repositories sharing the most active contributors with this one (Siblings), and the developer
 * tiers of the people who built it in the last 12 months (Built by). A toggle when both are there; Built by alone
 * when there are fewer than 3 siblings; nothing when neither is.
 */
export const WhoBuildsItCard: FC<WhoBuildsItCardProps> = ({ nameWithOwner, siblings, builtBy }) => {
  const hasSiblings = (siblings?.length ?? 0) >= MIN_SIBLINGS;
  const hasBuiltBy = !!builtBy?.counts.length;
  const [view, setView] = useState<'siblings' | 'builtBy'>(hasSiblings ? 'siblings' : 'builtBy');

  if (!hasSiblings && !hasBuiltBy) {
    return null;
  }

  return (
    <ProfileCard className="gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Who builds it</h2>
        {hasSiblings && hasBuiltBy && (
          <div role="group" aria-label="View" className="inline-flex rounded-md bg-muted p-0.5">
            {(
              [
                ['siblings', 'Siblings'],
                ['builtBy', 'Built by'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  'h-7 rounded-sm px-3 text-sm font-semibold',
                  view === key ? 'bg-card shadow-sm' : 'text-muted-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {view === 'siblings' && hasSiblings ? (
        <SiblingsView nameWithOwner={nameWithOwner} siblings={siblings!} />
      ) : (
        hasBuiltBy && <BuiltByView nameWithOwner={nameWithOwner} builtBy={builtBy!} />
      )}
    </ProfileCard>
  );
};
