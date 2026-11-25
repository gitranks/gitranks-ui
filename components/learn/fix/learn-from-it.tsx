'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { useEnter } from '@/components/learn/player/use-page-keys';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/workspace/kbd';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import {
  type FixCardWords,
  type FixMarks,
  type LearnFixPage,
  lessonCardOf,
  mainActionOf,
  similarBecauseOf,
  walkthroughCardOf,
} from '@/lib/learn/fix-page';
import { learnFixMarksPath } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';
import { cn } from '@/lib/utils';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';
import { NO_MASKED_READS } from '@/lib/workspace/masked-issue';
import type { PrRef } from '@/lib/workspace/pr-feedback';

/*
 * "Learn from it" under the issue card (page 12): the walkthrough's card and the lesson's, side by side, then the
 * change, then the person's similar issues. The cards are the same for everyone; a signed-in person's marks are read
 * in the browser once the page is up and fill places of fixed size on the cards, so nothing above the change moves.
 * What only a signed-in person sees (their similar issues, the line for the fixer) comes after the change.
 */

export type FixMarksRead = { marks: FixMarks | null; reads: MaskedListReads | null };

/** The person's marks as their route answers them; none on any failure. */
export async function readFixMarks(pr: PrRef): Promise<FixMarksRead> {
  try {
    const res = await fetch(learnFixMarksPath(pr), { cache: 'no-store' });
    if (!res.ok) return { marks: null, reads: null };
    const read = (await res.json()) as Partial<FixMarksRead>;
    return { marks: read.marks ?? null, reads: read.reads ?? null };
  } catch {
    return { marks: null, reads: null };
  }
}

/** A card: its eyebrow and its mark, and its link, each in a place of fixed height; its title, text and button. */
function FixCard({ card, main }: { card: FixCardWords; main: boolean }) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5',
        main && 'border-primary ring-1 ring-primary/30 ring-inset',
      )}
      aria-labelledby={`fix-card-${card.kind}`}
      data-fix-learn-card={card.kind}
      data-main={main ? '' : undefined}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{card.eyebrow}</span>
        <span
          className={cn(
            'text-xs font-medium whitespace-nowrap',
            card.mark?.tone === 'positive' ? 'text-positive-strong' : 'text-muted-foreground',
          )}
          data-fix-mark={card.mark ? card.kind : undefined}
        >
          {card.mark?.text ?? ''}
        </span>
      </div>
      <h2 id={`fix-card-${card.kind}`} className="m-0 text-base font-semibold text-pretty">
        {card.title}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        {card.text}
        {card.course ? (
          <>
            {' '}
            Part of{' '}
            <Link href={card.course.href} prefetch={false} className="font-medium text-foreground hover:underline">
              {card.course.name}
            </Link>
            .
          </>
        ) : null}
      </p>
      {/* The link's line is always kept: the fixer's "See your answers" arrives with their marks, and moves nothing. */}
      <p className="m-0 min-h-5 text-sm leading-5" data-fix-card-link-place={card.kind}>
        {card.link ? (
          <Link
            href={card.link.href}
            prefetch={false}
            className="font-medium text-link hover:underline"
            data-fix-card-link={card.kind}
          >
            {card.link.text}
          </Link>
        ) : null}
      </p>
      <Button asChild variant={main ? 'default' : 'outline'} className="mt-auto h-9 self-start px-4 max-sm:min-h-11">
        <Link href={card.button.href} prefetch={false} data-fix-card-button={card.kind}>
          {card.button.text}
          {main ? (
            <Kbd onPrimary className="max-sm:hidden">
              ⏎
            </Kbd>
          ) : null}
        </Link>
      </Button>
    </section>
  );
}

/** The person's similar issues, masked, each with why it is there; left out with none. */
function SimilarIssues({ marks, reads }: { marks: FixMarks; reads: MaskedListReads | null }) {
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const rows = marks.similar.filter((each) => !gone.has(each.row.issue.id));
  if (!rows.length) return null;
  const leave = (id: string) => setGone((was) => new Set([...was, id]));
  return (
    <section className="flex flex-col gap-3" aria-labelledby="fix-similar" data-fix-similar="">
      <h2 id="fix-similar" className="m-0 text-base font-semibold">
        Similar issues
      </h2>
      <MaskedList from="learn" pageFrom="learn" reads={reads ?? NO_MASKED_READS} foot={false}>
        <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
          {rows.map((each) => (
            <li key={each.row.issue.id} data-fix-similar-row={each.because}>
              <MaskedListRow issue={each.row.issue} full={each.row.full} onLeave={() => leave(each.row.issue.id)} />
              <p className="m-0 px-4 pb-3 text-xs text-muted-foreground sm:px-5">{similarBecauseOf(each)}</p>
            </li>
          ))}
        </ul>
      </MaskedList>
    </section>
  );
}

/** For the fixer alone: this is their fix's public page, and where their own page is. */
function FixerLine({ pullRequest, held }: { pullRequest: Route; held: boolean }) {
  return (
    <section className="flex flex-col gap-1 rounded-xl border border-dashed p-4 text-sm" data-fix-fixer="">
      <p className="m-0">
        <span className="font-semibold">This is the public page of your fix.</span>{' '}
        <span className="text-muted-foreground">Anyone can open it.</span>{' '}
        <Link href={pullRequest} prefetch={false} className="font-medium text-link hover:underline">
          Your pull request page
        </Link>
      </p>
      {held ? (
        <p className="m-0 text-muted-foreground" data-fix-held="">
          Your walkthrough is not shown on this page while people’s reports about it are looked at.
        </p>
      ) : null}
    </section>
  );
}

export type LearnFromItProps = {
  pr: PrRef;
  fix: LearnFixPage;
  /** The fixer's own page of the pull request. */
  pullRequest: Route;
  /** The change's card, drawn on the server: it sits between the cards and the person's similar issues. */
  children: ReactNode;
  /** The person's marks as already read (the board); left out, they are read in the browser. */
  initial?: FixMarksRead;
};

/** "Learn from it": the two cards, the change, and the signed-in person's part after it. */
export function LearnFromIt({ pr, fix, pullRequest, children, initial }: LearnFromItProps) {
  const router = useRouter();
  const [read, setRead] = useState<FixMarksRead>(initial ?? { marks: null, reads: null });
  useEffect(() => {
    if (initial || !hasSessionHint(document.cookie)) return;
    let live = true;
    void readFixMarks(pr).then((answer) => {
      if (live) setRead(answer);
    });
    return () => {
      live = false;
    };
  }, [initial, pr]);
  const { marks } = read;
  const cards = [walkthroughCardOf(pr, fix, marks), lessonCardOf(fix, marks)];
  const main = mainActionOf(cards, marks);
  const mainCard = cards.find((card) => card?.kind === main) ?? null;
  const act = useCallback(() => {
    if (mainCard) router.push(mainCard.button.href);
  }, [mainCard, router]);
  useEnter(mainCard ? act : null);
  const shown = cards.filter((card): card is FixCardWords => card !== null);
  return (
    <>
      {shown.length ? (
        <div className={cn('grid gap-4', shown.length > 1 && 'sm:grid-cols-2')} data-fix-learn="">
          {shown.map((card) => (
            <FixCard key={card.kind} card={card} main={card.kind === main} />
          ))}
        </div>
      ) : null}
      {children}
      {marks?.fixer ? <FixerLine pullRequest={pullRequest} held={marks.held} /> : null}
      {marks ? <SimilarIssues marks={marks} reads={read.reads} /> : null}
    </>
  );
}
