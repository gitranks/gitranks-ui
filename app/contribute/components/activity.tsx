'use client';

import { Check, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useId, useRef, useState } from 'react';

import { readContributeActivity } from '../actions';
import {
  ACTIVITY_STARTED_EVENT,
  activityDelayOf,
  activitySignatureOf,
  activityTabOf,
  etaOf,
  isRunning,
  itemsOn,
  STAGE_TEXT,
  shareOf,
  summaryOf,
  WAIT_TEXT,
} from '@/lib/contribute/activity-format';
import type {
  ContributeActivity,
  ContributeActivityItem,
  ContributeActivityTab,
} from '@/lib/contribute/contribute.types';
import { cn } from '@/lib/utils';

/** How long the bar says the user can leave, after they started something. */
const ANNOUNCE_MS = 12_000;
/** The repos an item lists before "and N more". */
const REPOS_SHOWN = 8;

type ActivityState = { activity: ContributeActivity | null; announced: boolean };
const ActivityContext = createContext<ActivityState>({ activity: null, announced: false });

/** Tells the bar the user just started something long: it reads at once and says they can leave the page. */
export function announceActivity() {
  window.dispatchEvent(new Event(ACTIVITY_STARTED_EVENT));
}

/**
 * The user's work in progress for the tabs and the bar under them. It reads the activity again only while something
 * runs (soon, then backing off to a minute; rarely while everything only waits), never while the tab is hidden, and at
 * once when a page announces new work. When the work moves on, the page is read again so its lists follow.
 */
export function ActivityProvider({ initial, children }: { initial: ContributeActivity | null; children: ReactNode }) {
  const router = useRouter();
  const [activity, setActivity] = useState(initial);
  const [announcedAt, setAnnouncedAt] = useState<number | null>(null);
  const latest = useRef(initial);
  const signature = useRef(activitySignatureOf(initial));
  const loop = useRef<{ start: (delay: number) => void; idle: () => boolean } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reads = 0;
    let running = false;
    let hiddenWait = false;
    let stopped = false;

    const schedule = (delay: number) => {
      clearTimeout(timer);
      running = true;
      timer = setTimeout(read, delay);
    };
    const read = async () => {
      if (document.visibilityState !== 'visible') {
        hiddenWait = true;
        return;
      }
      const result = await readContributeActivity().catch(() => null);
      if (stopped) return;
      reads += 1;
      if (!result?.ok) {
        // Kept as it was; tried again later, while there was something to show.
        if (latest.current?.items.length) schedule(activityDelayOf(reads, latest.current.items));
        else running = false;
        return;
      }
      const next = result.data;
      const moved = activitySignatureOf(next);
      if (moved !== signature.current && signature.current) router.refresh();
      signature.current = moved;
      latest.current = next;
      setActivity(next);
      if (next?.items.length) schedule(activityDelayOf(reads, next.items));
      else running = false;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && hiddenWait) {
        hiddenWait = false;
        read();
      }
    };
    const onStarted = () => {
      reads = 0;
      setAnnouncedAt(Date.now());
      schedule(0);
    };

    loop.current = {
      start: (delay) => {
        reads = 0;
        schedule(delay);
      },
      idle: () => !running && !hiddenWait,
    };
    if (latest.current?.items.length) schedule(activityDelayOf(0, latest.current.items));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    };
  }, [router]);

  // A newer read of the page (it was read again): taken, and read again while it shows work.
  useEffect(() => {
    if (!initial || (latest.current && initial.readAt <= latest.current.readAt)) return;
    latest.current = initial;
    signature.current = activitySignatureOf(initial);
    setActivity(initial);
    if (initial.items.length && loop.current?.idle()) loop.current.start(activityDelayOf(0, initial.items));
  }, [initial]);

  useEffect(() => {
    if (announcedAt === null) return;
    const timer = setTimeout(() => setAnnouncedAt(null), ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [announcedAt]);

  return (
    <ActivityContext.Provider value={{ activity, announced: announcedAt !== null }}>
      {children}
    </ActivityContext.Provider>
  );
}

/** A small dot on a tab with work in progress. */
export function ActivityDot({ tab }: { tab: ContributeActivityTab }) {
  const { activity } = useContext(ActivityContext);
  const items = itemsOn(activity, tab);
  if (!items.length) return null;
  const running = items.some(isRunning);
  return (
    <>
      <span
        aria-hidden="true"
        data-activity-dot={tab}
        className={cn(
          'ms-1.5 inline-block size-1.5 rounded-full align-middle',
          running ? 'bg-primary motion-safe:animate-pulse' : 'bg-muted-foreground/60',
        )}
      />
      <span className="sr-only">{running ? ' (working)' : ' (waiting)'}</span>
    </>
  );
}

/** The bar under the tabs, on the tab the current work belongs to. */
export function ActivityBar() {
  const { activity, announced } = useContext(ActivityContext);
  const items = itemsOn(activity, activityTabOf(usePathname()));
  const [now, setNow] = useState<Date | null>(null);

  // The estimates count down on the reader's clock; the server render shows none.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!items.length) return null;
  return <ActivityBarView items={items} announced={announced} now={now} />;
}

/** The bar itself: one quiet line, and the details on a click. */
export function ActivityBarView({
  items,
  announced = false,
  now = null,
  open: initiallyOpen = false,
}: {
  items: ContributeActivityItem[];
  announced?: boolean;
  now?: Date | null;
  open?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(initiallyOpen);
  const running = items.some(isRunning);
  const first = items[0];
  const share = shareOf(first);
  const eta = now && running ? etaOf(first.expectedAt, now) : null;
  const summary = summaryOf(items);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4" data-activity-bar={running ? 'running' : 'waiting'}>
      <section
        aria-label="Work in progress"
        className={cn(
          'overflow-hidden rounded-xl border bg-card motion-safe:transition-shadow',
          announced && 'border-primary/40 shadow-sm',
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
            {announced && running ? (
              <span className="absolute -inset-1.5 rounded-full border-2 border-primary/60 opacity-0 motion-safe:animate-contribute-ring" />
            ) : null}
            {running ? (
              <span className="absolute inset-0 rounded-full bg-primary opacity-0 motion-safe:animate-contribute-pulse" />
            ) : null}
            <span className={cn('relative size-2.5 rounded-full', running ? 'bg-primary' : 'bg-muted-foreground/60')} />
          </span>
          <span className="line-clamp-2 min-w-0 flex-1 font-medium sm:truncate">{summary}</span>
          {eta ? <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{eta}</span> : null}
          <span className="shrink-0 text-xs text-muted-foreground">{open ? 'Hide' : 'Details'}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-muted-foreground motion-safe:transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {running ? <ProgressLine share={share} /> : null}
        <p className="sr-only" role="status">
          {summary}
        </p>
        {announced ? (
          <p className="px-4 pt-2 pb-3 text-xs text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0">
            This keeps going in the background, so you can leave this page. Progress shows here and on the tab.
          </p>
        ) : null}
        {open ? (
          <div id={id} className="flex flex-col divide-y border-t">
            {items.map((item) => (
              <ItemDetails key={item.kind} item={item} now={now} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** A thin line under the bar: how far the work is, or a slow sweep when it cannot be counted. */
function ProgressLine({ share }: { share: number | null }) {
  return (
    <div aria-hidden="true" className="relative h-0.5 overflow-hidden bg-muted">
      {share === null ? (
        <span className="absolute inset-y-0 left-0 w-1/3 bg-primary/70 motion-safe:animate-navigation-progress motion-reduce:w-full motion-reduce:bg-primary/30" />
      ) : (
        <span
          className="absolute inset-y-0 left-0 bg-primary motion-safe:transition-[width] motion-safe:duration-700"
          style={{ width: `${Math.max(4, share * 100)}%` }}
        />
      )}
    </div>
  );
}

/** One item: its line, how far it is, and its repos with where each one is. */
function ItemDetails({ item, now }: { item: ContributeActivityItem; now: Date | null }) {
  const [all, setAll] = useState(false);
  const eta = now && isRunning(item) ? etaOf(item.expectedAt, now) : null;
  const shown = all ? item.repos : item.repos.slice(0, REPOS_SHOWN);
  const counted = isRunning(item) && item.done !== null && item.total ? `${item.done} of ${item.total} done` : null;
  const progress = [counted, eta ? `done in ${eta}` : null].filter(Boolean).join(' · ');
  const note =
    item.kind === 'STACK_RESOLVE'
      ? `We're reading the dependency files of your ${item.repos.length === 1 ? 'repo' : `${item.repos.length} repos`}. It usually takes a minute or two, at most 15.`
      : WAIT_TEXT[item.kind];

  return (
    <div className="flex flex-col gap-2 px-4 py-3" data-activity={item.kind}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm font-medium">{item.label}</span>
        {progress ? <span className="text-xs text-muted-foreground">{progress}</span> : null}
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {shown.length ? (
        <ul className="flex flex-col gap-1">
          {shown.map((repo) => (
            <li
              key={repo.repositoryId}
              data-stage={repo.stage}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate font-mono text-[12px]">{repo.nameWithOwner}</span>
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1',
                  repo.stage === 'READ' ? 'text-muted-foreground' : 'text-foreground/80',
                )}
              >
                {repo.stage === 'READ' ? <Check aria-hidden="true" className="size-3" /> : null}
                {STAGE_TEXT[repo.stage]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {item.repos.length > shown.length ? (
        <button type="button" onClick={() => setAll(true)} className="self-start text-xs text-link hover:underline">
          Show {item.repos.length - shown.length} more
        </button>
      ) : null}
    </div>
  );
}
