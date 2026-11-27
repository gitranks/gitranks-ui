'use client';

import { BookOpen, Check, ChevronDown, ChevronRight, Package } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';

import { RoundDetails } from './round-details';
import { interviewLessonPath } from '@/lib/interviews/paths';
import {
  countWordsOf,
  type ItemStanding,
  itemNamesOf,
  itemStandingOf,
  itemsMineOf,
  learnLineOf,
  type RoundSize,
  roundLessonsOf,
  roundProgressWordsOf,
  roundSizeWordsOf,
} from '@/lib/interviews/plan';
import type { InterviewItem, InterviewPlanMine, InterviewPlanPage, InterviewRound } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/*
 * One round of a plan, in its three sizes: finished, one row; to come, two lines that open in place; the one the
 * person is in, open, with a row for each item. A round with nothing to do is drawn as its facts and never opens.
 */

const CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-4.5';

/** "You are here", on the round and on the item it points to. */
export const HereChip = () => (
  <span className="whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground">
    You are here
  </span>
);

/** One item of a round: its name first and its course second, how far the person is, and the lesson it opens. */
function ItemRow({
  item,
  standing,
  here,
  href,
}: {
  item: InterviewItem;
  standing: ItemStanding;
  here: boolean;
  href: Route | null;
}) {
  const { name, from } = itemNamesOf(item);
  const Mark = item.type === 'lessons' ? BookOpen : Package;
  const body = (
    <>
      <span className="text-muted-foreground" title={item.type === 'lessons' ? 'Lessons' : 'A project'}>
        <Mark aria-hidden="true" className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">
          <span aria-hidden="true"> · </span>
          {from}
        </span>
      </span>
      {standing.words && <span className="whitespace-nowrap text-xs text-muted-foreground">{standing.words}</span>}
      {here ? (
        <HereChip />
      ) : (
        standing.kind === 'done' && (
          <span className="text-positive">
            <Check aria-hidden="true" className="size-4" />
            <span className="sr-only">Done</span>
          </span>
        )
      )}
    </>
  );
  const row = 'flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2';
  return (
    <li data-round-item={item.key} data-item-standing={standing.kind} className="border-t first:border-t-0">
      {href ? (
        <Link href={href} className={cn(row, 'hover:bg-accent')}>
          {body}
        </Link>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}

export type PlanRoundProps = {
  plan: InterviewPlanPage;
  round: InterviewRound;
  size: RoundSize;
  mine: InterviewPlanMine | null;
};

/** A round of the plan, in the size the person's place gives it; a closed or finished round opens in place. */
export function PlanRound({ plan, round, size, mine }: PlanRoundProps) {
  const [opened, setOpened] = useState(false);
  const sizeWords = roundSizeWordsOf(round);

  if (size === 'facts') {
    return (
      <div data-round-size="facts" className="flex w-full flex-col gap-2 rounded-xl border bg-card px-4.5 py-3.5">
        <span className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-base font-semibold">{round.title}</span>
          {sizeWords && <span className="text-sm text-muted-foreground">{sizeWords}</span>}
        </span>
        <span className="text-sm text-muted-foreground">
          {[round.checks?.trim(), 'Nothing to prepare with us for this round yet.'].filter(Boolean).join(' ')}
        </span>
      </div>
    );
  }

  const open = size === 'open' || opened;
  const toggle = () => setOpened((was) => !was);

  if (!open && size === 'row') {
    const learned = countWordsOf(roundLessonsOf(round), 'lesson learned', 'lessons learned');
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={toggle}
        data-round-size="row"
        className="flex w-full items-center gap-2.5 rounded-xl border bg-card px-4.5 py-3 text-left hover:bg-accent"
      >
        <span className="min-w-0 flex-1 text-base font-semibold">{round.title}</span>
        {learned && <span className="whitespace-nowrap text-xs text-muted-foreground">{learned}</span>}
        <span className="text-muted-foreground">
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      </button>
    );
  }

  // How far a round is goes on its head only for a round started out of order: the round "You are here" points to
  // says it on its items.
  const progress = size === 'open' ? null : roundProgressWordsOf(round, mine);
  const headWords = [sizeWords, progress].filter(Boolean).join(' · ');

  if (!open) {
    const learn = learnLineOf(round);
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={toggle}
        data-round-size="closed"
        className="flex w-full flex-col gap-2 rounded-xl border bg-card px-4.5 py-3.5 text-left hover:bg-accent"
      >
        <span className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-base font-semibold">{round.title}</span>
          <span className="flex items-center gap-2">
            {headWords && <span className="text-sm text-muted-foreground">{headWords}</span>}
            <span className="text-muted-foreground">
              <ChevronRight aria-hidden="true" className="size-4" />
            </span>
          </span>
        </span>
        {learn && (
          <span className="text-sm">
            <span className="text-muted-foreground">Learn: </span>
            {learn}
          </span>
        )}
      </button>
    );
  }

  const here = size === 'open';
  const items = itemsMineOf(mine);
  const nextItem = here ? (mine?.next?.round === round.key ? mine.next.item : null) : null;
  const company = plan.company.slug;
  return (
    <div
      data-round-size={here ? 'open' : 'opened'}
      className={CARD}
      style={here ? { boxShadow: 'inset 0 0 0 1px var(--brand-soft-foreground)' } : undefined}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="m-0 text-base font-semibold">
          {here ? (
            round.title
          ) : (
            <button
              type="button"
              aria-expanded
              onClick={toggle}
              className="inline-flex items-center gap-1.5 text-left hover:underline"
            >
              {round.title}
              <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
            </button>
          )}
        </h3>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {headWords && <span className="text-sm text-muted-foreground">{headWords}</span>}
          {here && <HereChip />}
        </span>
      </div>
      {round.checks?.trim() && <p className="m-0 text-sm text-muted-foreground">{round.checks}</p>}
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border bg-background p-0">
        {round.items.map((item) => {
          const own = items.get(item.key);
          const lesson = item.type === 'lessons' ? (own?.next ?? item.first) : null;
          return (
            <ItemRow
              key={item.key}
              item={item}
              standing={itemStandingOf(item, own)}
              here={nextItem === item.key}
              href={lesson ? interviewLessonPath(lesson, company, plan.slug) : null}
            />
          );
        })}
      </ul>
      <RoundDetails round={round} sources={plan.sources} company={plan.company} plan={plan.slug} />
    </div>
  );
}
