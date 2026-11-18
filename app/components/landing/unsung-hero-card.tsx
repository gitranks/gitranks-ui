'use client';

import { Star } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC } from 'react';

import { formatCompact, formatFull, GithubAvatar } from './landing-ui';
import { Button } from '@/components/ui/button';
import { heroWeekLabel, UNSUNG_HEROES_PATH, type UnsungHero } from '@/lib/unsung-hero/unsung-hero';
import { reportHeroHit } from '@/lib/unsung-hero/use-unsung-hero';
import { getRepoPath } from '@/utils/repo-paths';

/** The card's two sentences, as written: no other wording asks for a star. */
export const HERO_CARD_ASK = 'Probably in your app too. A star is a free way to say thanks.';
export const HERO_CARD_NOTE =
  'Our way to back lesser-known maintainers. Nobody pays to be here, nobody gets anything for starring.';

const avatarOf = (owner: string) => `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}`;

const Figure: FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

/**
 * This week's Unsung hero in the home page's right column (under Search on a phone): the repository, its downloads a
 * week and stars, a plain link to star it on GitHub, and the stars it got since Monday.
 */
export const UnsungHeroCard: FC<{ hero: UnsungHero }> = ({ hero }) => {
  const { nameWithOwner } = hero.repo;
  const [owner] = nameWithOwner.split('/');

  return (
    <section
      aria-label="Unsung hero of the week"
      className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-semibold tracking-wider uppercase">Unsung hero · {heroWeekLabel(hero)}</span>
        <Link href={UNSUNG_HEROES_PATH as Route} prefetch={false} className="hover:underline">
          Past heroes
        </Link>
      </div>
      <Link href={getRepoPath(nameWithOwner)} prefetch={false} className="flex items-center gap-3 hover:underline">
        <GithubAvatar url={avatarOf(owner)} size={44} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{nameWithOwner}</div>
          <div className="truncate text-xs text-muted-foreground">{hero.line}</div>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-4">
        <Figure value={formatCompact(hero.weeklyDownloads)} label="downloads a week" />
        {hero.starsAtStart !== null && <Figure value={formatFull(hero.starsAtStart)} label="stars" />}
      </div>
      <p className="text-sm text-muted-foreground">{HERO_CARD_ASK}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <a
            href={`https://github.com/${nameWithOwner}`}
            target="_blank"
            rel="noopener"
            onClick={() => reportHeroHit({ kind: 'github', repo: nameWithOwner })}
          >
            <Star aria-hidden="true" />
            Star on GitHub
          </a>
        </Button>
        <span className="text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-positive tabular-nums">+{formatFull(hero.starsGained)}</span>{' '}
          since Monday
        </span>
      </div>
      <p className="border-t pt-3 text-xs text-muted-foreground">{HERO_CARD_NOTE}</p>
    </section>
  );
};
