'use client';

import type { Route } from 'next';
import Link from 'next/link';
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { readIssueStatuses, readIssuesPage } from '../actions';
import { IssueCard } from './issue-card';
import { IssueCardCompact } from './issue-card-compact';
import type { IssueLive } from './issue-live-status';
import { isGone, useFocusOnGone } from './issue-live-status';
import { type IssuesQuery, issuesHref } from './issues-filter';
import { OtherIssuesDivider, SetIssuesHeading } from './issues-mode';
import { onContributeChanges } from '@/lib/contribute/changes-bus';
import type { ContributeIssue, ContributeIssuesFilter, ContributeSet } from '@/lib/contribute/contribute.types';
import {
  createLiveFeed,
  ISSUES_PAGE_SIZE,
  type LiveFeed,
  type LiveRow,
  type LiveSnapshot,
} from '@/lib/contribute/live-issues';
import { tiersOf } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

type LivePage = { items: ContributeIssue[]; total: number; next: string | null };

type LiveState = { feed: LiveFeed; snapshot: LiveSnapshot };
const LiveContext = createContext<LiveState | null>(null);

const NO_PAGE: LivePage = { items: [], total: 0, next: null };
const NO_FILTER: ContributeIssuesFilter = {};

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A newer read of the page (another cursor, the filters, a refresh): the list takes it in. */
const signatureOf = (page: LivePage) => `${page.total}|${page.next ?? ''}|${page.items.map((i) => i.issueId).join()}`;

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
function useLiveFeed(
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

const liveOf = (feed: LiveFeed, row: LiveRow): IssueLive => ({
  status: row.status,
  attemptId: row.attemptId,
  onTaken: () => feed.markTaken(row.issue.issueId),
  onSkipped: () => feed.forget(row.issue.issueId),
});

/**
 * The Issues page's column, live: the total over it and the lists in it follow the issues taken meanwhile. The same
 * column whatever the page holds (none, when the feed is not available), so a new read never rebuilds it.
 */
export function LiveIssues({
  page,
  filter,
  className,
  children,
}: {
  page: LivePage | null;
  filter: ContributeIssuesFilter;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const state = useLiveFeed(page ?? NO_PAGE, ISSUES_PAGE_SIZE, filter, root);
  return (
    <LiveContext.Provider value={state}>
      <div ref={root} tabIndex={-1} className={cn('outline-none', className)}>
        <LiveAnnouncer rows={state.snapshot.rows} />
        {children}
      </div>
    </LiveContext.Provider>
  );
}

const countOf = (total: number) => `${total.toLocaleString('en-US')} open issue${total === 1 ? '' : 's'}`;

/** "42 open issues match your languages and topics", counting out the ones taken since. */
export function LiveIssuesTotal({ total, rest }: { total: number; rest: string }) {
  const live = useContext(LiveContext);
  const shown = live ? live.snapshot.total : total;
  return (
    <span className="text-sm text-muted-foreground" data-total={shown}>
      {countOf(shown)} match your languages and topics{rest}
    </span>
  );
}

export function LiveIssueList({ rows, feed, other = false }: { rows: LiveRow[]; feed: LiveFeed; other?: boolean }) {
  if (!rows.length) return null;
  return (
    <ul className={cn('divide-y overflow-hidden rounded-xl border bg-card', other && 'border-dashed')}>
      {rows.map((row) => (
        <LiveRowItem key={row.issue.issueId} row={row}>
          <IssueCard issue={row.issue} other={other} live={liveOf(feed, row)} />
        </LiveRowItem>
      ))}
    </ul>
  );
}

/**
 * The issues as rows, split under the user's list and the other issues where the mode does, and the way to the next
 * page; `empty` once every row has left and the feed has no more.
 */
export function LiveIssuesFeed({
  set,
  query,
  empty,
}: {
  set?: ContributeSet | null;
  query: IssuesQuery;
  empty: ReactNode;
}) {
  const live = useContext(LiveContext);
  if (!live) return null;
  const { feed, snapshot } = live;
  const byId = new Map(snapshot.rows.map((row) => [row.issue.issueId, row]));
  const rowsOf = (issues: ContributeIssue[]) => issues.map(({ issueId }) => byId.get(issueId) as LiveRow);
  const split = set
    ? tiersOf(
        snapshot.rows.map(({ issue }) => issue),
        set.mode,
      )
    : null;

  return (
    <>
      {!snapshot.rows.length && !snapshot.next ? empty : null}
      {split && set ? (
        <>
          {split.set.length ? <SetIssuesHeading set={set} /> : null}
          <LiveIssueList rows={rowsOf(split.set)} feed={feed} />
          {split.other.length ? <OtherIssuesDivider set={set} none={!split.set.length && !query.after} /> : null}
          <LiveIssueList rows={rowsOf(split.other)} feed={feed} other />
        </>
      ) : (
        <LiveIssueList rows={snapshot.rows} feed={feed} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {query.after ? (
          <Link href={issuesHref({ ...query, after: undefined }) as Route} prefetch={false} className="text-link">
            ← Back to the best matches
          </Link>
        ) : (
          <span />
        )}
        {snapshot.next ? (
          <Link
            href={issuesHref({ ...query, after: snapshot.next }) as Route}
            prefetch={false}
            className="font-semibold text-link"
          >
            More issues →
          </Link>
        ) : null}
      </div>
    </>
  );
}

function LivePick({ row }: { row: LiveRow }) {
  const card = useRef<HTMLElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  useFocusOnGone(isGone(row.status), card, status);
  return (
    <IssueCardCompact
      issue={row.issue}
      variant="pick"
      live={{ status: row.status, attemptId: row.attemptId }}
      cardRef={card}
      statusRef={status}
    />
  );
}

/**
 * Overview's top picks, live: `items` in rank order, the first `limit` shown. A taken one says so, then leaves, and
 * the next pick takes its place; `empty` while none is shown (also while the next ones are read). The page's own
 * refreshes are taken in, so a pick saying it was taken finishes its way out.
 */
export function LiveUpNext({ items, total, next, limit, empty }: LivePage & { limit: number; empty: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const { snapshot } = useLiveFeed({ items, total, next }, limit, NO_FILTER, root);
  return (
    <div ref={root} tabIndex={-1} data-picks={snapshot.rows.length} className="outline-none">
      <LiveAnnouncer rows={snapshot.rows} />
      {snapshot.rows.length ? (
        <ol className="divide-y overflow-hidden rounded-xl border bg-card">
          {snapshot.rows.map((row) => (
            <LiveRowItem key={row.issue.issueId} row={row}>
              <LivePick row={row} />
            </LiveRowItem>
          ))}
        </ol>
      ) : (
        empty
      )}
    </div>
  );
}
