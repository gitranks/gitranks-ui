import type { Route } from 'next';
import Link from 'next/link';

import {
  ARCHIVE_LEAD,
  ARCHIVE_PICK_NOTE,
  ARCHIVE_UNAVAILABLE,
  type Archive,
  archiveSummaryOf,
  formatCompactCount,
  formatFullCount,
} from '../archive';
import { Figure, HeroThisWeek, PastHeroRow } from './hero-parts';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Button } from '@/components/ui/button';
import { UNSUNG_HERO_APPLY_PATH } from '@/lib/unsung-hero/unsung-hero';

/** What the archive says while it cannot be read. */
export const ARCHIVE_UNAVAILABLE_TEXT = 'Unsung heroes are not available right now. Try again in a few minutes.';

/** How we pick, as the three cards say it. */
const HOW_WE_PICK = [
  {
    title: 'Heavily used',
    text: 'Repositories with 100+ stars depend on it directly, and it is among the most used packages of its registry.',
  },
  {
    title: 'Few stars for its reach',
    text: 'Lots of use per star, from a personal account without a big following.',
  },
  {
    title: 'Maintainer first',
    text: 'We tell the maintainer 4 days ahead. One click opts them out, no questions asked.',
  },
];

const Card = ({ children, className = '' }: Readonly<{ children: React.ReactNode; className?: string }>) => (
  <div
    className={`flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm dark:shadow-none ${className}`}
  >
    {children}
  </div>
);

function HowWePick() {
  return (
    <section aria-labelledby="how" className="flex flex-col gap-3">
      <h2 id="how" className="text-lg font-semibold">
        How we pick
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {HOW_WE_PICK.map(({ title, text }) => (
          <Card key={title}>
            <span className="font-medium">{title}</span>
            <p className="text-sm text-muted-foreground">{text}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{ARCHIVE_PICK_NOTE}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-1">
          <span className="font-medium">Think your package belongs here?</span>
          <span className="text-sm text-muted-foreground">Tell us about it. It is free, and always will be.</span>
        </div>
        <Button variant="outline" asChild>
          <Link href={UNSUNG_HERO_APPLY_PATH as Route} prefetch={false}>
            Apply for a slot
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Totals({ totals }: Readonly<{ totals: Archive['totals'] }>) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-4 md:grid-cols-4">
      <Figure value={formatFullCount(totals.heroes)} label="heroes so far" />
      <Figure value={`+${formatFullCount(totals.starsGained)}`} label="stars while featured" positive />
      <Figure value={formatCompactCount(totals.weeklyDownloads)} label="downloads a week, all of them" />
      <Figure value="0" label="paid to be here" />
    </dl>
  );
}

type UnsungHeroesScreenProps = {
  archive: Archive | typeof ARCHIVE_UNAVAILABLE;
  /** The page's JSON-LD. */
  jsonLd?: object[];
};

/**
 * `/unsung-heroes`: the lead, the four totals and a sentence that says them, this week's hero, the past ones newest
 * first, and how we pick. In a week with no hero there is no "This week"; with no hero yet, no totals either.
 */
export function UnsungHeroesScreen({ archive, jsonLd }: Readonly<UnsungHeroesScreenProps>) {
  const unavailable = archive === ARCHIVE_UNAVAILABLE;
  const summary = unavailable ? '' : archiveSummaryOf(archive);

  return (
    <>
      <Header />
      {jsonLd && <JsonLd payloads={jsonLd} />}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-10 pb-14">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Open source, ranked.
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">Unsung heroes</h1>
          <p className="max-w-[62ch] text-lg text-muted-foreground">{ARCHIVE_LEAD}</p>
        </div>

        {unavailable && (
          <p role="status" className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            {ARCHIVE_UNAVAILABLE_TEXT}
          </p>
        )}

        {!unavailable && archive.totals.heroes > 0 && (
          <div className="flex flex-col gap-4">
            <Totals totals={archive.totals} />
            {summary && <p className="max-w-prose text-sm text-muted-foreground">{summary}</p>}
          </div>
        )}

        {!unavailable && !archive.live && archive.past.length === 0 && (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            The first Unsung hero is on its way.
          </p>
        )}

        {!unavailable && archive.live && <HeroThisWeek hero={archive.live} />}

        {!unavailable && archive.past.length > 0 && (
          <section aria-labelledby="past" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="past" className="text-lg font-semibold">
                Past heroes
              </h2>
              <span className="text-sm text-muted-foreground">Newest first</span>
            </div>
            <ol className="m-0 flex list-none flex-col p-0">
              {archive.past.map((hero) => (
                <PastHeroRow key={`${hero.startsAt}-${hero.repo.nameWithOwner}`} hero={hero} />
              ))}
            </ol>
          </section>
        )}

        <HowWePick />
      </main>
    </>
  );
}
