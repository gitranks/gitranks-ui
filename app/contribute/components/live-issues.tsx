'use client';

import type { Route } from 'next';
import Link from 'next/link';
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
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
import type { ContributeIssue, ContributeIssuesFilter, ContributeSet } from '@/lib/contribute/contribute.types';
import {
  createLiveFeed,
  ISSUES_PAGE_SIZE,
  type LiveFeed,
  type LiveRow,
  type LiveSnapshot,
  startStatusPolling,
} from '@/lib/contribute/live-issues';
import { tiersOf } from '@/lib/contribute/set-format';
import { cn } from '@/lib/utils';

type LivePage = { items: ContributeIssue[]; total: number; next: string | null };

type LiveState = { feed: LiveFeed; snapshot: LiveSnapshot };
const LiveContext = createContext<LiveState | null>(null);

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A new read of the page (another cursor, the filters, a refresh with other issues): the list starts over from it. */
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
  const stays = (row: HTMLElement) => !row.querySelector('[data-gone]');
  const to = rows.slice(at + 1).find(stays) ?? rows.slice(0, at).reverse().find(stays);
  (to?.querySelector<HTMLElement>('[data-live-focus]') ?? scope).focus();
}

/**
 * Keeps a list of issues as they are now: its rows are read again every 20 s while the tab is shown (a minute once
 * the user is idle), and a taken one says so, then leaves; the total counts it out, and a page left short is filled
 * from the next issues under the same filters. The focus on a row that leaves moves to the next row, or the list.
 */
function useLiveFeed(
  page: LivePage,
  limit: number,
  filter: ContributeIssuesFilter,
  root: RefObject<HTMLElement | null>,
) {
  const [feed] = useState(() =>
    createLiveFeed({
      ...page,
      limit,
      readStatus: (ids) => readIssueStatuses(ids),
      readMore: (after, first) => readIssuesPage({ filter, after, first }),
      reducedMotion,
    }),
  );
  const snapshot = useSyncExternalStore(feed.subscribe, feed.getSnapshot, feed.getSnapshot);

  useEffect(() => {
    feed.onBeforeRemove((issueId) => moveFocusOff(root.current, issueId));
    const stop = startStatusPolling(feed.poll, { document, window });
    return () => {
      stop();
      feed.onBeforeRemove(null);
      feed.destroy();
    };
  }, [feed, root]);

  return { feed, snapshot };
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

function LiveIssuesInner({
  page,
  filter,
  className,
  children,
}: {
  page: LivePage;
  filter: ContributeIssuesFilter;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const state = useLiveFeed(page, ISSUES_PAGE_SIZE, filter, root);
  return (
    <LiveContext.Provider value={state}>
      <div ref={root} tabIndex={-1} className={cn('outline-none', className)}>
        {children}
      </div>
    </LiveContext.Provider>
  );
}

/**
 * The Issues page's column, live: the total over it and the lists in it follow the issues taken meanwhile. Without a
 * page it is the column alone.
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
  if (!page?.items.length) return <div className={className}>{children}</div>;
  return (
    <LiveIssuesInner key={signatureOf(page)} page={page} filter={filter} className={className}>
      {children}
    </LiveIssuesInner>
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

function LiveUpNextInner({ page, limit, empty }: { page: LivePage; limit: number; empty: ReactNode }) {
  const root = useRef<HTMLOListElement>(null);
  const { snapshot } = useLiveFeed(page, limit, {}, root);
  if (!snapshot.rows.length && !snapshot.next) return empty;
  return (
    <ol
      ref={root}
      tabIndex={-1}
      data-picks={snapshot.rows.length}
      className="divide-y overflow-hidden rounded-xl border bg-card outline-none"
    >
      {snapshot.rows.map((row) => (
        <LiveRowItem key={row.issue.issueId} row={row}>
          <LivePick row={row} />
        </LiveRowItem>
      ))}
    </ol>
  );
}

/**
 * Overview's top picks, live: `items` in rank order, the first `limit` shown. A taken one says so, then leaves, and
 * the next pick takes its place; `empty` once none is left.
 */
export function LiveUpNext({ items, total, next, limit, empty }: LivePage & { limit: number; empty: ReactNode }) {
  const page = { items, total, next };
  return <LiveUpNextInner key={signatureOf(page)} page={page} limit={limit} empty={empty} />;
}
