'use client';

import { CopyIcon } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { formatFull, GithubAvatar, TierChip } from './landing-ui';
import type { RankCardData, RankCardEntry, RankingKey } from './rank-card.types';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getPercentileRank } from '@/utils/get-percentile-rank';

const RANKING_LABELS: Record<RankingKey, { tab: string; title: string; unit: string; badge: string }> = {
  s: { tab: 'Stars', title: 'Stars rank', unit: 'stars', badge: 'stars-rank' },
  c: { tab: 'Contributions', title: 'Contributor rank', unit: 'contribution stars', badge: 'contributions-rank' },
  f: { tab: 'Followers', title: 'Followers rank', unit: 'followers', badge: 'followers-rank' },
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

const copyBadge = async (login: string, ranking: RankingKey) => {
  const origin = window.location.origin;
  const snippet = `<a href="${origin}/profile/${login}"><img src="${origin}/badges/${login}/${RANKING_LABELS[ranking].badge}.svg" alt="GitRanks badge for ${login}" /></a>`;

  try {
    await navigator.clipboard.writeText(snippet);
    toast.success('Badge copied. Paste it into your README.');
  } catch {
    toast.error('Copy failed. Open the badge builder to copy it by hand.');
  }
};

/** The signed-in visitor's own card. Loaded after the page, from a route cached per user. */
const YourRankCard: FC<{ login: string }> = ({ login }) => {
  const [card, setCard] = useState<RankCardData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [ranking, setRanking] = useState<RankingKey>('s');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/rank-card')
      .then((res) => (res.ok ? (res.json() as Promise<RankCardData>) : null))
      .then((data) => {
        if (cancelled) return;
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
        <GithubAvatar url={card?.avatarUrl} size={44} />
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
          <div role="tablist" aria-label="Ranking" className="flex flex-wrap gap-1.5">
            {(['s', 'c', 'f'] as RankingKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={ranking === key}
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => copyBadge(card.login, ranking)} disabled={!entry?.position}>
              <CopyIcon />
              Copy badge
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/badge/builder/${card.login}`} prefetch={false}>
                Customize
              </Link>
            </Button>
          </div>
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
        <GithubAvatar url={example.avatarUrl} size={44} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{example.name || example.login}</div>
          <div className="truncate text-xs text-muted-foreground">
            {example.login}
            {example.location ? ` · ${example.flag ?? ''} ${example.location}` : ''}
          </div>
        </div>
      </Link>
      <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {RANKING_LABELS[example.ranking].title}
      </div>
      <RankFacts entry={entry} ranking={example.ranking} />
      <div className="flex justify-center gap-1.5" role="tablist" aria-label="Example">
        {examples.map((e, i) => (
          <button
            key={e.login}
            type="button"
            role="tab"
            aria-selected={i === index}
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
