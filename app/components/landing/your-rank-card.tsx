'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type FC, useMemo, useState } from 'react';

import { GithubAvatar } from './landing-ui';
import type { RankCardData, RankCardEntry, RankingKey } from './rank-card.types';
import { RANKING_LABELS, RankFacts } from './rank-facts';
import { useRankCard } from './use-rank-card';
import { useEntityFacts } from '@/app/badge/builder/[[...login]]/hooks/use-entity-facts';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { findBadge } from '@/badge/v3/catalogue';
import { availableChoices, badgeTiles } from '@/badge/v3/tiles';
import type { By } from '@/badge/v3/types';
import { BadgeImages } from '@/components/badge-tiles/badge-tiles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** The ranking with the best tier, then the best position: what the card opens on. */
const bestRanking = (card: RankCardData): RankingKey => {
  const score = (entry?: RankCardEntry) =>
    entry?.tier ? entry.tier.tier * 10 + entry.tier.level : entry?.position ? 0 : -1;
  return (['s', 'c', 'f'] as RankingKey[]).reduce((best, key) =>
    score(card.rankings[key]) > score(card.rankings[best]) ? key : best,
  );
};

const BY: Record<RankingKey, By> = { s: 'stars', c: 'contributions', f: 'followers' };

const RANK_BADGE = findBadge('user', 'rank');

/**
 * The visitor's rank badge for the ranking the card shows, drawn live in the site's theme (Auto), with the ways into
 * the builder: its last step for this badge, or every badge of the profile. The badge data is read in the browser,
 * from the same public data the builder reads.
 */
const YourBadge: FC<{ login: string; ranking: RankingKey; ranked: boolean }> = ({ login, ranking, ranked }) => {
  const facts = useEntityFacts('user', login);
  const by = BY[ranking];
  const tile = useMemo(() => {
    if (facts.status !== 'found') return null;
    const now = new Date();
    const choices = availableChoices(facts.facts, [{ id: 'rank', query: by === 'stars' ? undefined : { by } }], now);
    return badgeTiles(facts.facts, choices, now)[0] ?? null;
  }, [facts, by]);
  const embedHref = builderHref({ kind: 'user', name: login, badge: RANK_BADGE, style: { by }, embed: true }) as Route;
  const moreHref = builderHref({ kind: 'user', name: login }) as Route;

  return (
    <>
      {ranked && (
        // One 20 px row whatever it holds (the badge, its placeholder or a line), so nothing below moves.
        <div className="flex flex-col items-start gap-1.5 rounded-lg bg-background/60 px-3 py-2.5">
          <span className="text-xs opacity-80">Your badge</span>
          <div className="flex h-5 max-w-full items-center">
            {tile ? (
              <BadgeImages tile={tile} className="h-5 w-auto max-w-full object-contain object-left" />
            ) : facts.status === 'loading' || facts.status === 'idle' ? (
              <Skeleton className="h-5 w-48 bg-current/10">
                <span className="sr-only">Loading your badge</span>
              </Skeleton>
            ) : (
              <span className="truncate text-sm">No preview right now; the builder has it.</span>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {ranked && (
          <Button size="sm" asChild>
            <Link href={embedHref} rel="nofollow" prefetch={false}>
              Get this badge
            </Link>
          </Button>
        )}
        <Link href={moreHref} rel="nofollow" prefetch={false} className="text-sm underline">
          More badges
        </Link>
      </div>
    </>
  );
};

/** The signed-in visitor's own card, opened on their best ranking until they pick another. */
export const YourRankCard: FC<{ login: string }> = ({ login }) => {
  const { card, state } = useRankCard(login);
  const [picked, setRanking] = useState<RankingKey | null>(null);
  const ranking = picked ?? (card ? bestRanking(card) : 's');

  const entry = card?.rankings[ranking];

  return (
    <div className="order-first flex min-w-0 flex-col gap-4 rounded-xl bg-brand-soft p-5 text-brand-soft-foreground md:order-none md:p-6">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold tracking-wider uppercase">Your rank</span>
      </div>
      <div className="flex items-center gap-3">
        <GithubAvatar url={card?.avatarUrl} size={44} eager />
        <div className="min-w-0">
          <div className="truncate font-semibold">{login}</div>
          <Link href={`/profile/${login}`} prefetch={false} className="text-xs underline opacity-80">
            Open profile
          </Link>
        </div>
      </div>

      {state === 'loading' && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-10 w-40 bg-current/10" />
          <Skeleton className="h-5 w-56 bg-current/10" />
        </div>
      )}

      {state === 'unranked' && (
        <p className="text-sm">
          You&apos;re not ranked yet. A ranking needs at least 5 stars on your own repositories, 5 stars on others&apos;
          repositories you merged pull requests into, or 5 followers.{' '}
          <Link href="/methodology" prefetch={false} className="underline">
            How rankings work
          </Link>
        </p>
      )}

      {state === 'missing' && (
        <p className="text-sm">
          We couldn&apos;t load your ranks right now.{' '}
          <Link href={`/profile/${login}`} prefetch={false} className="underline">
            See them on your profile
          </Link>
          .
        </p>
      )}

      {state === 'ready' && card && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(['s', 'c', 'f'] as RankingKey[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={ranking === key}
                onClick={() => setRanking(key)}
                className={cn(
                  'rounded-sm border border-current/30 px-2 py-0.5 text-xs transition-colors',
                  ranking === key ? 'border-current font-semibold' : 'opacity-75 hover:opacity-100',
                )}
              >
                {RANKING_LABELS[key].tab}
              </button>
            ))}
          </div>
          {entry?.position ? (
            <RankFacts entry={entry} ranking={ranking} />
          ) : (
            <p className="text-sm">Not ranked by {RANKING_LABELS[ranking].unit} yet.</p>
          )}
          <YourBadge login={card.login} ranking={ranking} ranked={!!entry?.position} />
        </>
      )}
    </div>
  );
};
