'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { type FC, useEffect, useMemo, useState } from 'react';

import { formatFull, GithubAvatar } from './landing-ui';
import type { RankCardData, RankCardEntry, RankingKey } from './rank-card.types';
import { useEntityFacts } from '@/app/badge/builder/[[...login]]/hooks/use-entity-facts';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { findBadge } from '@/badge/v3/catalogue';
import { availableChoices, badgeTiles } from '@/badge/v3/tiles';
import type { By } from '@/badge/v3/types';
import { BadgeImages } from '@/components/badge-tiles/badge-tiles';
import { Flag } from '@/components/flag/flag';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { TierChip } from '@/components/tier-chip/tier-chip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getPercentileRank } from '@/utils/get-percentile-rank';

const RANKING_LABELS: Record<RankingKey, { tab: string; title: string; unit: string }> = {
  s: { tab: 'Stars', title: 'Stars rank', unit: 'stars' },
  c: { tab: 'Contributions', title: 'Contributor rank', unit: 'contribution stars' },
  f: { tab: 'Followers', title: 'Followers rank', unit: 'followers' },
};

const EXAMPLE_INTERVAL_MS = 6000;

/** The ranking with the best tier, then the best position: what the card opens on. */
const bestRanking = (card: RankCardData): RankingKey => {
  const score = (entry?: RankCardEntry) =>
    entry?.tier ? entry.tier.tier * 10 + entry.tier.level : entry?.position ? 0 : -1;
  return (['s', 'c', 'f'] as RankingKey[]).reduce((best, key) =>
    score(card.rankings[key]) > score(card.rankings[best]) ? key : best,
  );
};

const RankFacts: FC<{ entry: RankCardEntry; ranking: RankingKey }> = ({ entry, ranking }) => {
  const percentile = getPercentileRank(entry.position, entry.rankedCount ?? undefined);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
          #{formatFull(entry.position)}
        </span>
        {entry.rankedCount && <span className="opacity-80">of {formatFull(entry.rankedCount)}</span>}
        <RankDelta current={entry.position} previous={entry.previous} className="font-mono" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {entry.tier && <TierChip tier={entry.tier} />}
        {percentile !== null && <span>Top {percentile}%</span>}
        <span className="font-mono tabular-nums">
          {formatFull(entry.value)} {RANKING_LABELS[ranking].unit}
        </span>
      </div>
    </div>
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
      {ranked && (facts.status === 'loading' || tile) && (
        <div className="flex flex-col items-start gap-1.5 rounded-lg bg-background/60 px-3 py-2.5">
          <span className="text-xs opacity-80">Your badge</span>
          {tile ? (
            <BadgeImages tile={tile} className="h-5 w-auto max-w-full" />
          ) : (
            <Skeleton className="h-5 w-48 bg-current/10">
              <span className="sr-only">Loading your badge</span>
            </Skeleton>
          )}
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

/** The signed-in visitor's own card. Loaded after the page, from a route cached per user. */
const YourRankCard: FC<{ login: string }> = ({ login }) => {
  const [card, setCard] = useState<RankCardData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unranked' | 'missing'>('loading');
  const [ranking, setRanking] = useState<RankingKey>('s');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/rank-card')
      .then(async (res) => {
        if (res.status === 404) return 'unranked' as const;
        return res.ok ? ((await res.json()) as RankCardData) : null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data === 'unranked') {
          setState('unranked');
          return;
        }
        if (!data) {
          setState('missing');
          return;
        }
        setCard(data);
        setRanking(bestRanking(data));
        setState('ready');
      })
      .catch(() => !cancelled && setState('missing'));
    return () => {
      cancelled = true;
    };
  }, []);

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

export type ExampleRank = RankCardData & { ranking: RankingKey };

/** Rotating example cards for signed-out visitors: what a search will show them. */
const ExampleCards: FC<{ examples: ExampleRank[] }> = ({ examples }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || examples.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % examples.length), EXAMPLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, examples.length]);

  const example = examples[index];
  const entry = example?.rankings[example.ranking];

  if (!example || !entry) {
    return null;
  }

  return (
    <section
      aria-label="Example rank card"
      className="hidden min-w-0 flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm md:flex"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-semibold tracking-wider uppercase">Example rank card</span>
        <span className="tabular-nums">
          {index + 1} of {examples.length}
        </span>
      </div>
      <Link href={`/profile/${example.login}`} prefetch={false} className="flex items-center gap-3 hover:underline">
        <GithubAvatar url={example.avatarUrl} size={44} eager />
        <div className="min-w-0">
          <div className="truncate font-semibold">{example.name || example.login}</div>
          <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{example.login}</span>
            {example.location && (
              <>
                <span className="shrink-0">·</span>
                <Flag flag={example.flag} />
                <span className="truncate">{example.location}</span>
              </>
            )}
          </div>
        </div>
      </Link>
      <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {RANKING_LABELS[example.ranking].title}
      </div>
      <RankFacts entry={entry} ranking={example.ranking} />
      <div className="flex justify-center gap-1.5">
        {examples.map((e, i) => (
          <button
            key={e.login}
            type="button"
            aria-pressed={i === index}
            aria-label={`Show ${e.login}`}
            onClick={() => setIndex(i)}
            className={cn('size-2 rounded-full transition-colors', i === index ? 'bg-primary' : 'bg-border')}
          />
        ))}
      </div>
    </section>
  );
};

/** The hero's right column: your own card when signed in, examples otherwise. */
export const HeroAside: FC<{ examples: ExampleRank[] }> = ({ examples }) => {
  const { data: session, status } = useSession();
  const login = session?.user?.githubLogin;

  if (status === 'authenticated' && login) {
    return <YourRankCard login={login} />;
  }

  return <ExampleCards examples={examples} />;
};
