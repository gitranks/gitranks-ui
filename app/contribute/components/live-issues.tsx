'use client';

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import type { IssueLive } from '@/components/workspace/issue-live-status';
import { readIssueStatuses, readIssuesPage } from '@/lib/contribute/actions';
import { createLiveFeed, type LiveFeed, type LiveRow } from '@/lib/contribute/live-issues';
import { cn } from '@/lib/utils';
import { onContributeChanges } from '@/lib/workspace/changes-bus';
import type { ContributeDailyCap, ContributeIssue, ContributeIssuesFilter } from '@/lib/workspace/contribute.types';

export type LivePage = {
  items: ContributeIssue[];
  total: number;
  next: string | null;
  dailyCap?: ContributeDailyCap | null;
};

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A newer read of the page (another cursor, the filters, a refresh): the list takes it in. */
const signatureOf = (page: LivePage) =>
  `${page.total}|${page.next ?? ''}|${page.dailyCap?.reached ?? ''}|${page.items.map((i) => i.issueId).join()}`;

/**
 * The focus on a row about to leave, moved to the nearest row that stays (the next one first), else to the list
 * itself: never lost to the page.
 */
export function moveFocusOff(scope: HTMLElement | null, issueId: string) {
  if (!scope) return;
  const rows = [...scope.querySelectorAll<HTMLElement>('[data-live-row]')];
  const at = rows.findIndex((row) => row.dataset.liveRow === issueId);
  if (at < 0 || !rows[at].contains(document.activeElement)) return;
  const stays = (row: HTMLElement) => !!row.querySelector('[data-live-focus]:not([data-gone])');
  const to = rows.slice(at + 1).find(stays) ?? rows.slice(0, at).reverse().find(stays);
  (to?.querySelector<HTMLElement>('[data-live-focus]') ?? scope).focus();
}

/**
 * Keeps a list of issues as they are now: its rows are read again when Contribute's poll says an issue's availability
 * may have moved (`ISSUES`), and a taken one says so, then leaves; the total counts it out, and a page left short is
 * filled from the next issues under the same filters. The focus on a row that leaves moves to the next row, or the
 * list. One list for the life of the page: a newer read of it is taken in, never a list made anew, so nothing around
 * it (the filters, the focus) starts over.
 */
export function useLiveFeed(
  page: LivePage,
  limit: number,
  filter: ContributeIssuesFilter,
  root: RefObject<HTMLElement | null>,
) {
  const filterNow = useRef(filter);
  const [feed] = useState(() =>
    createLiveFeed({
      ...page,
      limit,
      readStatus: (ids) => readIssueStatuses(ids),
      readMore: (after, first) => readIssuesPage({ filter: filterNow.current, after, first }),
      reducedMotion,
    }),
  );
  const snapshot = useSyncExternalStore(feed.subscribe, feed.getSnapshot, feed.getSnapshot);

  const signature = signatureOf(page);
  const taken = useRef(signature);
  // Before paint, so the older rows never show under the newer filters.
  useLayoutEffect(() => {
    filterNow.current = filter;
    if (taken.current === signature) return;
    taken.current = signature;
    feed.reset(page);
  }, [feed, signature, page, filter]);

  useEffect(() => {
    feed.start();
    feed.onBeforeRemove((issueId) => moveFocusOff(root.current, issueId));
    // A page that came short (the day's cap left issues off) is filled now, not at the next change.
    void feed.fill();
    // One status read at a time; a change named while one runs reads once more after it, never lost.
    let reading = false;
    let again = false;
    const read = () => {
      if (reading) {
        again = true;
        return;
      }
      reading = true;
      void feed
        .poll()
        .then((outcome) => {
          if (outcome === 'stop') stop();
        })
        .catch(() => undefined)
        .finally(() => {
          reading = false;
          if (again) {
            again = false;
            read();
          }
        });
    };
    const stop = onContributeChanges((changed) => {
      if (changed.includes('ISSUES')) read();
    });
    return () => {
      stop();
      feed.onBeforeRemove(null);
      feed.stop();
    };
  }, [feed, root]);

  return { feed, snapshot };
}

/**
 * The list's one live region, out of sight: says each issue that was taken, or that the user's own agent is on.
 * The cards say it too, but are not live regions themselves, so the focus moved onto one is not said twice.
 */
export function LiveAnnouncer({ rows }: { rows: LiveRow[] }) {
  return (
    <p role="status" className="sr-only">
      {rows
        .filter(({ status }) => status !== 'AVAILABLE')
        .map(({ issue, status }) => (
          <span key={issue.issueId}>
            {issue.nameWithOwner} #{issue.number}:{' '}
            {status === 'TAKEN' ? 'taken by another contributor.' : 'your agent is on this.'}{' '}
          </span>
        ))}
    </p>
  );
}

/** A row of a live list: it fades and folds away when it leaves, at once with reduced motion. */
export function LiveRowItem({ row, children }: { row: LiveRow; children: ReactNode }) {
  return (
    <li
      data-live-row={row.issue.issueId}
      data-leaving={row.leaving || undefined}
      className={cn(
        'grid',
        row.leaving
          ? 'grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none'
          : 'grid-rows-[1fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </li>
  );
}

/** What a row knows of its issue as it is now, and what it tells the list. */
export const liveOf = (feed: LiveFeed, row: LiveRow): IssueLive => ({
  status: row.status,
  attemptId: row.attemptId,
  onTaken: () => feed.markTaken(row.issue.issueId),
  onSkipped: () => feed.forget(row.issue.issueId),
  onFold: () => feed.fold(row.issue.issueId),
});

/**
 * The end of the list once the day's cap on new issues is reached: the issues shown today stay, new ones come at
 * 00:00 UTC.
 */
export function DailyCapEnd({ cap }: { cap: ContributeDailyCap }) {
  return (
    <div data-feed-end="daily-cap" className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3.5">
      <span className="font-semibold">That&apos;s today&apos;s new issues</span>
      <span className="text-sm text-muted-foreground">
        You&apos;ve seen{' '}
        <span className="font-mono tabular-nums text-foreground">{cap.limit.toLocaleString('en-US')}</span> new issues
        today, the most we show in a day. More arrive at 00:00 UTC; the ones you&apos;ve seen stay on this list until
        then.
      </span>
    </div>
  );
}
