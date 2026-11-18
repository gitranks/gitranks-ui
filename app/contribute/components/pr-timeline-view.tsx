import Link from 'next/link';
import type { ReactNode } from 'react';

import { Eyebrow, HEADING, Panel } from './primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { reportPathOf } from '@/lib/contribute/pr-feedback';
import type { PrTimeline, PrTimelineMilestone } from '@/lib/contribute/pr-timeline.types';
import { prTimelineFallbackPath } from '@/lib/contribute/pr-timeline-path';
import {
  dayHeadingOf,
  dayKeyOf,
  factsOf,
  milestoneWordsOf,
  openedLineOf,
  stateWordOf,
  timeOf,
} from '@/lib/contribute/pr-timeline-words';
import { cn } from '@/lib/utils';

const external = { target: '_blank', rel: 'noreferrer' } as const;

function OutLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} {...external} className={cn('font-medium text-link hover:underline', className)}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const STATE_BADGE: Record<PrTimeline['state'], string> = {
  MERGED: 'bg-brand-soft text-brand-soft-foreground',
  OPEN: 'bg-positive/10 text-positive-strong',
  CLOSED: 'bg-muted text-muted-foreground',
};

function Head({ timeline }: { timeline: PrTimeline }) {
  return (
    <header className="flex flex-col gap-2">
      <Eyebrow className="font-sans font-semibold tracking-[0.08em] text-primary">
        How this pull request was made
      </Eyebrow>
      <span className="font-mono text-sm text-muted-foreground">
        <a href={timeline.url} {...external} className="hover:underline">
          {timeline.nameWithOwner} · pull request #{timeline.number} ↗
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </span>
      <h1 className={HEADING.page}>{timeline.title ?? `Pull request #${timeline.number}`}</h1>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <Badge className={cn('border-transparent', STATE_BADGE[timeline.state])}>{stateWordOf(timeline.state)}</Badge>
        <span aria-hidden="true" className="text-muted-foreground max-sm:hidden">
          ·
        </span>
        <span className="text-muted-foreground">{openedLineOf(timeline)}</span>
        <span aria-hidden="true" className="text-muted-foreground max-sm:hidden">
          ·
        </span>
        <span className="text-muted-foreground">
          fixes <OutLink href={timeline.issue.url}>issue #{timeline.issue.number} ↗</OutLink>
        </span>
      </div>
      {timeline.stopped ? (
        <p className="text-sm text-muted-foreground" data-stopped>
          A maintainer stopped GitRanks work on this pull request. It stays as it is on GitHub.
        </p>
      ) : null}
    </header>
  );
}

function Facts({ timeline }: { timeline: PrTimeline }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {factsOf(timeline).map((fact) => (
        <div key={fact.label} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="font-mono text-lg font-semibold break-words tabular-nums">{fact.value}</dd>
          {fact.note ? <dd className="text-xs text-muted-foreground">{fact.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** The rail between the time and the row: a line through every row, a dot on each, filled on the last. */
function Rail({ dot }: { dot: 'agent' | 'other' | 'end' | null }) {
  return (
    <span className="relative flex justify-center before:absolute before:inset-y-0 before:w-0.5 before:bg-border group-first/row:before:top-2.5 group-last/row:before:bottom-auto group-last/row:before:h-2.5">
      {dot ? (
        <span
          data-who={dot}
          className={cn(
            'relative mt-1 size-3 rounded-full border-2 bg-background',
            dot === 'other' ? 'border-muted-foreground' : 'border-primary',
            dot === 'end' && 'bg-primary',
          )}
        />
      ) : null}
    </span>
  );
}

const ROW = 'group/row grid grid-cols-[3rem_1rem_minmax(0,1fr)] gap-x-3';

function Row({ row, timeline, last }: { row: PrTimelineMilestone; timeline: PrTimeline; last: boolean }) {
  const words = milestoneWordsOf(row, timeline);
  const ends = last && (row.kind === 'MERGED' || row.kind === 'CLOSED');
  return (
    <li className={ROW} data-kind={row.kind.toLowerCase()}>
      <span className="pt-0.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {row.dayOnly ? '' : <time dateTime={row.at}>{timeOf(row.at)}</time>}
      </span>
      <Rail dot={ends ? 'end' : words.agent ? 'agent' : 'other'} />
      <div className="flex min-w-0 flex-col gap-1.5 pb-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold break-words">
            {words.title}
            {words.titleLink ? (
              <>
                {' '}
                <OutLink href={words.titleLink.href}>{words.titleLink.text}</OutLink>
              </>
            ) : null}
          </span>
          {words.actor ? (
            <Badge
              className={cn(
                'border-transparent',
                words.agent ? 'bg-brand-soft text-brand-soft-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {words.actor}
            </Badge>
          ) : null}
        </div>
        {words.text ? <p className="text-sm break-words text-muted-foreground">{words.text}</p> : null}
        {words.pills.length ? (
          <div className="flex flex-wrap gap-2">
            {words.pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground tabular-nums"
              >
                {pill}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Timeline({ timeline }: { timeline: PrTimeline }) {
  const rows = timeline.milestones;
  const items: ReactNode[] = [];
  let day: string | null = null;
  rows.forEach((row, at) => {
    const key = dayKeyOf(row.at);
    if (key !== day) {
      day = key;
      items.push(
        <li key={`day-${key}`} className={ROW}>
          <span />
          <Rail dot={null} />
          <div className="pt-0.5 pb-3.5">
            <Eyebrow className="font-sans font-semibold tracking-[0.08em]">{dayHeadingOf(row.at)}</Eyebrow>
          </div>
        </li>,
      );
    }
    items.push(<Row key={`${row.kind}-${row.at}-${at}`} row={row} timeline={timeline} last={at === rows.length - 1} />);
  });
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-labelledby="pr-timeline-heading">
      <h2 id="pr-timeline-heading" className={HEADING.card}>
        Timeline
      </h2>
      <ol className="flex flex-col">{items}</ol>
      <p className="text-xs text-muted-foreground">
        Times are in UTC.
        {timeline.partial ? ' Maintainers’ reviews could not be read just now; they show again shortly.' : ''}
      </p>
      <p className="border-t pt-4 text-xs text-muted-foreground">
        GitRanks made this page from the record of the work. It shows what the agent did and when. The contributor’s own
        conversation with their agent is never shown.
      </p>
    </section>
  );
}

function Feedback({ timeline }: { timeline: PrTimeline }) {
  const from = { from: timeline.attemptId };
  return (
    <Panel className="gap-3 sm:p-5" aria-labelledby="pr-timeline-feedback">
      <h2 id="pr-timeline-feedback" className={HEADING.block}>
        Was this pull request useful?
      </h2>
      <p className="text-sm text-muted-foreground">
        Your answer shapes which issues we pick and how careful contributors have to be.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={reportPathOf(from, 'helped')} prefetch={false}>
            This PR helped
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={reportPathOf(from)} prefetch={false}>
            Report this PR
          </Link>
        </Button>
      </div>
      {timeline.helped > 0 ? (
        <span className="text-sm" data-helped>
          <span className="font-mono font-semibold tabular-nums">{timeline.helped.toLocaleString('en-US')}</span>{' '}
          <span className="text-muted-foreground">
            {timeline.helped === 1 ? 'person said it helped' : 'people said it helped'}
          </span>
        </span>
      ) : null}
      <span className="border-t pt-3 text-xs text-muted-foreground">
        You sign in with GitHub when you click. You can add a comment; comments are private.
      </span>
    </Panel>
  );
}

function Change({ timeline }: { timeline: PrTimeline }) {
  const { change } = timeline;
  const rows: [string, string][] = [
    ['Files', change.files.toLocaleString('en-US')],
    ['Lines', `+${change.added.toLocaleString('en-US')} −${change.removed.toLocaleString('en-US')}`],
    ['Commits', change.commits.toLocaleString('en-US')],
    ['Tests added', change.testsAdded.toLocaleString('en-US')],
  ];
  return (
    <Panel className="gap-3 sm:p-5" aria-labelledby="pr-timeline-change">
      <h2 id="pr-timeline-change" className={HEADING.block}>
        The change
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">Counted by GitRanks from the work it pushed.</p>
      <OutLink href={`${timeline.url}/files`}>See the diff on GitHub ↗</OutLink>
    </Panel>
  );
}

function ForMaintainers({ timeline }: { timeline: PrTimeline }) {
  return (
    <Panel className="gap-3 sm:p-5" aria-labelledby="pr-timeline-maintainers">
      <h2 id="pr-timeline-maintainers" className={HEADING.block}>
        For maintainers
      </h2>
      <p className="text-sm text-muted-foreground">
        Every GitRanks pull request follows your repo’s rules. You can set preferences or opt out in one step.
      </p>
      <Link href={prTimelineFallbackPath(timeline.attemptId)} className="font-medium text-link hover:underline">
        How GitRanks Contribute works →
      </Link>
    </Panel>
  );
}

/**
 * A GitRanks Contribute pull request's public timeline: the head, five facts, the milestones by day, and beside them
 * the feedback, the change and a word for maintainers. On a phone the feedback comes before the timeline. Reads no
 * session: the same page for everyone it is shown to.
 */
export function PrTimelineScreen({ timeline }: { timeline: PrTimeline }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-7 pb-16">
      <Head timeline={timeline} />
      <Facts timeline={timeline} />
      {/* One column on a phone, feedback first; on a laptop the timeline on the left, the cards on the right. */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-x-12">
        <div className="lg:col-start-2 lg:row-start-1">
          <Feedback timeline={timeline} />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Timeline timeline={timeline} />
        </div>
        <aside className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <Change timeline={timeline} />
          <ForMaintainers timeline={timeline} />
        </aside>
      </div>
    </main>
  );
}
