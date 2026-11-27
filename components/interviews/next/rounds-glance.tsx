'use client';

import { BookOpen, Check, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { RoundPointMark } from '@/components/interviews/plan/round-line';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { NextScreen, RoundPanel } from '@/lib/interviews/next';
import type { RoundSegment } from '@/lib/interviews/round-line';
import type { InterviewPlanPage } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/*
 * Where the person stands on the connecting screen: the plan's rounds on one line, across the column. Every point opens
 * a small panel over the page with that round's parts, each of which can be started now, so nothing moves. On a phone
 * the rounds are points on one short line with one caption under it; "All rounds", or a press on the line, opens them
 * as a list from the bottom.
 */

/** A piece of the line across: solid behind the person, grey ahead, none at the ends. */
const segmentStyle = (segment: RoundSegment): CSSProperties => ({
  background:
    segment === 'solid' ? 'var(--brand-soft-foreground)' : segment === 'grey' ? 'var(--border)' : 'transparent',
});

const Segment = ({ segment }: { segment: RoundSegment }) => (
  <span aria-hidden="true" data-round-segment={segment} className="h-0.5 flex-1" style={segmentStyle(segment)} />
);

/** A round's panel: its name and where the person stands, its parts as rows that open them, and the way to the round. */
function Panel({ panel }: { panel: RoundPanel }) {
  return (
    <div className="flex flex-col gap-2" data-round-panel={panel.number}>
      <div className="flex items-baseline justify-between gap-3 px-2">
        <span className="text-sm font-semibold">{panel.title}</span>
        {panel.aside && <span className="text-xs text-muted-foreground">{panel.aside}</span>}
      </div>
      {panel.parts.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {panel.parts.map((part) => (
            <li key={part.key}>
              <Link
                href={part.href}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent max-sm:min-h-11"
              >
                <BookOpen aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 font-medium">{part.name}</span>
                {part.words && <span className="text-xs whitespace-nowrap text-muted-foreground">{part.words}</span>}
                {part.done && (
                  <>
                    <Check aria-hidden="true" className="size-4 shrink-0 text-positive" />
                    <span className="sr-only">, done</span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={panel.open} className="px-2 text-xs font-medium text-link hover:underline">
        Open this round in the plan
      </Link>
    </div>
  );
}

/** The line across a wide screen: a column for each round, its point between two pieces of line, its name under it. */
function WideLine({ plan, screen }: { plan: InterviewPlanPage; screen: NextScreen }) {
  const here = screen.phone.find((round) => round.here)?.number ?? null;
  return (
    <ol
      className="m-0 grid list-none p-0"
      style={{ gridTemplateColumns: `repeat(${plan.rounds.length}, minmax(0, 1fr))` }}
      aria-label="The rounds at a glance"
    >
      {plan.rounds.map((round, index) => {
        const mark = screen.marks[index];
        const panel = screen.panels[index];
        return (
          <li key={round.number} className="flex min-w-0 flex-col">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-round-glance={round.number}
                  className="flex min-w-0 flex-col items-center gap-1.5 rounded-md hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="flex w-full items-center">
                    <Segment segment={mark.above} />
                    <RoundPointMark point={mark.point} number={round.number} />
                    <Segment segment={mark.below} />
                  </span>
                  <span
                    className={cn(
                      'px-1.5 text-center text-xs text-balance',
                      round.number === here ? 'font-semibold' : 'text-muted-foreground',
                    )}
                  >
                    {round.title}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-[340px] max-w-[calc(100vw-2rem)] rounded-lg p-3 shadow-lg">
                <Panel panel={panel} />
              </PopoverContent>
            </Popover>
          </li>
        );
      })}
    </ol>
  );
}

/** The line on a phone: smaller points, the round the person is in at full size, one caption, and "All rounds". */
function PhoneLine({ screen }: { screen: NextScreen }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {/* The rounds as points: a press opens the same list as "All rounds", which is the way in for a keyboard. */}
      <div className="flex cursor-pointer items-center" aria-hidden="true" onClick={() => setOpen(true)}>
        {screen.marks.map((mark, index) => (
          <span key={mark.number} className={cn('flex items-center', index > 0 && 'flex-1')}>
            {index > 0 && <Segment segment={mark.above} />}
            <RoundPointMark
              point={mark.point}
              number={mark.number}
              className={mark.point === 'here' ? undefined : 'size-[22px] text-[11px]'}
            />
          </span>
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-sm">
          <span className="font-semibold">{screen.caption.lead}</span>
          {screen.caption.title && (
            <>
              <span aria-hidden="true"> · </span>
              {screen.caption.title}
            </>
          )}
        </span>
        <Drawer open={open} onOpenChange={setOpen}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 text-xs font-medium text-link hover:underline max-sm:min-h-11"
          >
            All rounds
          </button>
          <DrawerContent aria-describedby={undefined}>
            <section className="flex flex-col gap-2 px-4 pt-3 pb-6" aria-label="The rounds">
              <div className="flex items-center justify-between gap-3">
                <DrawerTitle className="m-0 text-base font-semibold">The rounds</DrawerTitle>
                <DrawerClose
                  className="inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
                  aria-label="Close"
                >
                  <X aria-hidden="true" className="size-4" />
                </DrawerClose>
              </div>
              <ol className="m-0 flex list-none flex-col p-0">
                {screen.phone.map((round, index) => {
                  const mark = screen.marks[index];
                  return (
                    <li key={round.number} className={cn(index > 0 && 'border-t')}>
                      <Link
                        href={round.open}
                        onClick={() => setOpen(false)}
                        className="flex min-h-11 items-center gap-3 px-1 py-2.5 hover:bg-accent"
                      >
                        <RoundPointMark
                          point={mark.point}
                          number={round.number}
                          className={mark.point === 'here' ? undefined : 'size-[22px] text-[11px]'}
                        />
                        <span className={cn('min-w-0 flex-1 text-sm', round.here ? 'font-semibold' : 'font-medium')}>
                          {round.title}
                        </span>
                        {round.words && (
                          <span className="text-xs whitespace-nowrap text-muted-foreground">{round.words}</span>
                        )}
                        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

/** The rounds at a glance: the wide line, or the phone's, in one card. */
export function RoundsGlance({ plan, screen }: { plan: InterviewPlanPage; screen: NextScreen }) {
  return (
    <div className="rounded-xl border bg-card" data-rounds-glance="">
      <div className="px-3 pt-[18px] pb-3.5 max-sm:hidden">
        <WideLine plan={plan} screen={screen} />
      </div>
      <div className="p-3.5 pb-3 sm:hidden">
        <PhoneLine screen={screen} />
      </div>
    </div>
  );
}
