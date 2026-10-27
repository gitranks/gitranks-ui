import { Star } from 'lucide-react';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import {
  articleFor,
  formatRatio,
  leadStargazer,
  listSeparator,
  othersParts,
  STARS_BEST_TOP_COMPACT,
  STARS_BEST_TOP_FULL,
  shownLegendRatio,
  starsBestView,
  tiersPresent,
} from '../utils/stars-best';
import { tierCountText } from '../utils/who-builds-it';
import { TIER_BG, TierAvatar } from './tier-avatar';
import { REPO_TIER_NAMES } from '@/app/app.consts';
import { Eyebrow, ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { tierLabel, tierStrongTextClass, tierTextClass } from '@/components/tier-chip/tier-chip';
import { TierIcon } from '@/components/tier-icon/tier-icon';
import { cn } from '@/lib/utils';
import type { PageRepoQuery } from '@/types/generated/graphql';

type StarsBest = NonNullable<NonNullable<PageRepoQuery['repo']>['starsBest']>;
type Stargazer = StarsBest['top'][number];

type StarsBestSectionProps = {
  starsBest?: StarsBest | null;
  /** The repository's tier (1–7), named in the Legend ratio's comparison. */
  repoTier?: number | null;
};

// The card's surface: a light wash of Legend gold over the card. Avatar rings take it as their gap colour.
const SURFACE =
  '[--surface:color-mix(in_oklab,var(--tier-7)_6%,var(--card))] bg-(--surface) border-[color-mix(in_oklab,var(--tier-7)_35%,var(--border))]';
const RING_GAP = 'ring-offset-(--surface)';
const BADGE_SURFACE = 'bg-(--surface) ring-(--surface)';

const Heading: FC = () => (
  <Eyebrow as="h2" className="inline-flex items-center gap-2 font-bold text-tier-7-strong">
    <Star aria-hidden className="size-4 fill-current" />
    Starred by the best
  </Eyebrow>
);

const profilePath = (login: string) => `/profile/${login}` as const;

/** Avatars side by side, overlapping, each linked to its profile when it has a login. */
const AvatarStack: FC<{ people: Stargazer[] }> = ({ people }) => (
  <ul className="flex items-center pl-2">
    {people.map(({ login, avatarUrl, tier, level }, at) => {
      const tierName = tierLabel({ tier, level });
      const avatar = (
        <TierAvatar
          url={avatarUrl}
          label={login ? `${login}, ${tierName}` : tierName}
          tier={tier}
          className={RING_GAP}
          badgeClassName={BADGE_SURFACE}
        />
      );
      return (
        <li key={login ?? at} className="-ml-2">
          {login ? (
            <Link href={profilePath(login)} prefetch={false} title={`${login} · ${tierName}`} className="block">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
        </li>
      );
    })}
  </ul>
);

/** A top stargazer by name: avatar, login and tier, one link to the profile. */
const NamedStargazer: FC<{ person: Stargazer }> = ({ person: { login, avatarUrl, tier, level } }) => {
  const content = (
    <>
      <TierAvatar url={avatarUrl} label="" tier={tier} size="md" className={RING_GAP} badge={false} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn('truncate text-sm font-semibold', login && 'group-hover:underline')}
          title={login ?? undefined}
          translate="no"
        >
          {login ?? <span className="font-normal text-muted-foreground">Name not shown</span>}
        </span>
        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold', tierStrongTextClass(tier))}>
          <TierIcon tier={tier} className="size-3" />
          {tierLabel({ tier, level })}
        </span>
      </span>
    </>
  );
  return login ? (
    <Link href={profilePath(login)} prefetch={false} className="group flex min-w-0 items-center gap-2.5">
      {content}
    </Link>
  ) : (
    <div className="flex min-w-0 items-center gap-2.5">{content}</div>
  );
};

/** The share of each developer tier among them: a stacked bar, then the counts. */
const TierBreakdown: FC<{ counts: StarsBest['counts'] }> = ({ counts }) => {
  const present = tiersPresent(counts);
  const sum = present.reduce((total, { count }) => total + count, 0) || 1;

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {present.map(({ tier, count }) => (
          <span key={tier} className={TIER_BG[tier - 1]} style={{ width: `${(count / sum) * 100}%` }} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {present.map(({ tier, count }) => {
          const [number, ...name] = tierCountText(count, tier).split(' ');
          return (
            <li key={tier} className="inline-flex items-center gap-1.5">
              <TierIcon tier={tier} className={cn('size-3.5', tierTextClass(tier))} />
              <b className="font-mono font-semibold tabular-nums">{number}</b> {name.join(' ')}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const LegendRatio: FC<{ ratio: number; repoTier?: number | null }> = ({ ratio, repoTier }) => (
  <p className="text-sm">
    <b className="font-semibold">Legends star it {formatRatio(ratio)} more often</b> than they star other{' '}
    {repoTier ? `${REPO_TIER_NAMES[repoTier - 1]} repositories` : 'repositories of its tier'}.
  </p>
);

const FullSection: FC<{ starsBest: StarsBest; repoTier?: number | null }> = ({ starsBest, repoTier }) => {
  const top = starsBest.top.slice(0, STARS_BEST_TOP_FULL);
  const ratio = shownLegendRatio(starsBest.legendRatio);

  return (
    <ProfileCard className={cn('@container gap-0 p-5 md:p-6', SURFACE)}>
      <div className={cn('grid gap-x-8 gap-y-5', top.length > 0 && '@2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]')}>
        <div className="flex flex-col gap-3 @2xl:col-start-1 @2xl:row-start-1">
          <Heading />
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums @2xl:text-4xl">
              {starsBest.total.toLocaleString('en-US')}
            </span>
            <span className="text-base font-semibold @2xl:text-lg">top developers starred it</span>
          </p>
          <TierBreakdown counts={starsBest.counts} />
          {ratio !== null && <LegendRatio ratio={ratio} repoTier={repoTier} />}
        </div>
        {top.length > 0 && (
          <div className="flex flex-col gap-3 @2xl:col-start-2 @2xl:row-span-2 @2xl:row-start-1 @2xl:self-center">
            <Eyebrow as="h3">Highest ranked among them</Eyebrow>
            <div className="flex flex-col gap-3 @md:hidden">
              <AvatarStack people={top} />
              <ul className="flex flex-col gap-2.5">
                {top.slice(0, STARS_BEST_TOP_COMPACT).map((person, at) => (
                  <li key={person.login ?? at} className="min-w-0">
                    <NamedStargazer person={person} />
                  </li>
                ))}
              </ul>
            </div>
            <ul className="hidden gap-x-4 gap-y-3 @md:grid @md:grid-cols-2 @xl:grid-cols-3 @2xl:grid-cols-2">
              {top.map((person, at) => (
                <li key={person.login ?? at} className="min-w-0">
                  <NamedStargazer person={person} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground @2xl:col-start-1 @2xl:row-start-2">
          Out of the developers whose own repositories have 1,000+ stars. Updated monthly.
        </p>
      </div>
    </ProfileCard>
  );
};

/** "Starred by ana Legend 2, 1 more Legend and 2 Elites." */
const CompactSentence: FC<{ starsBest: StarsBest }> = ({ starsBest }) => {
  const first = leadStargazer(starsBest.top);
  const lead: ReactNode = first ? (
    <>
      {first.login ? (
        <Link href={profilePath(first.login)} prefetch={false} className="font-semibold hover:underline" translate="no">
          {first.login}
        </Link>
      ) : (
        articleFor(tierLabel(first))
      )}{' '}
      <span className={cn('font-semibold whitespace-nowrap', tierStrongTextClass(first.tier))}>
        <TierIcon tier={first.tier} className="mr-1 inline-block size-[1em] align-[-0.125em]" />
        {tierLabel(first)}
      </span>
    </>
  ) : null;
  const rest = othersParts(starsBest.counts, first);
  const parts: ReactNode[] = lead ? [lead, ...rest] : rest;
  // Neither names nor tiers came with the count: say how many.
  if (!parts.length) {
    parts.push(`${starsBest.total.toLocaleString('en-US')} top developer${starsBest.total === 1 ? '' : 's'}`);
  }

  return (
    <p className="min-w-[min(100%,16rem)] grow text-[15px] leading-snug [overflow-wrap:anywhere]">
      Starred by{' '}
      {parts.map((part, at) => (
        <span key={at}>
          {listSeparator(at, parts.length)}
          {part}
        </span>
      ))}
      .
    </p>
  );
};

const CompactStrip: FC<{ starsBest: StarsBest }> = ({ starsBest }) => (
  <ProfileCard className={cn('flex-row flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4', SURFACE)}>
    <Heading />
    {starsBest.top.length > 0 && <AvatarStack people={starsBest.top.slice(0, STARS_BEST_TOP_COMPACT)} />}
    <CompactSentence starsBest={starsBest} />
  </ProfileCard>
);

/**
 * Starred by the best: how many developers whose own repositories have 1,000+ stars starred this one, by tier, and
 * the highest ranked of them. The full section from 20 of them, a one-line strip under that, nothing without any.
 */
export const StarsBestSection: FC<StarsBestSectionProps> = ({ starsBest, repoTier }) => {
  const view = starsBestView(starsBest);
  if (!view || !starsBest) return null;

  return (
    <section aria-label="Starred by the best">
      {view === 'full' ? (
        <FullSection starsBest={starsBest} repoTier={repoTier} />
      ) : (
        <CompactStrip starsBest={starsBest} />
      )}
    </section>
  );
};
