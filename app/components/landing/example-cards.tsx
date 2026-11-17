'use client';

import Link from 'next/link';
import { type FC, useEffect, useState } from 'react';

import { GithubAvatar } from './landing-ui';
import type { RankCardData, RankingKey } from './rank-card.types';
import { RANKING_LABELS, RankFacts } from './rank-facts';
import { Flag } from '@/components/flag/flag';
import { cn } from '@/lib/utils';

const EXAMPLE_INTERVAL_MS = 6000;

export type ExampleRank = RankCardData & { ranking: RankingKey };

/** Rotating example cards for signed-out visitors: what a search will show them. */
export const ExampleCards: FC<{ examples: ExampleRank[] }> = ({ examples }) => {
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
