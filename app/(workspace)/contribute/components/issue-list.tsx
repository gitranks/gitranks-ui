'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState, useTransition } from 'react';

import { filterOf, type IssuesQuery, isFiltered, issuesHref } from '@/app/contribute/components/issues-filter';
import { OtherIssuesDivider, SetIssuesHeading, SetOnlyEmpty } from '@/app/contribute/components/issues-mode';
import { DailyCapEnd, LiveAnnouncer, LiveRowItem, liveOf, useLiveFeed } from '@/app/contribute/components/live-issues';
import { StillRanking } from '@/app/contribute/components/still-ranking';
import { Button } from '@/components/ui/button';
import { IssueRow } from '@/components/workspace/issue-row';
import { LimitNotice } from '@/components/workspace/limit-notice';
import { PausedNotice } from '@/components/workspace/paused-notice';
import { ShowMore } from '@/components/workspace/show-more';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { ISSUES_PAGE_SIZE } from '@/lib/contribute/live-issues';
import { tiersOf } from '@/lib/contribute/set-format';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import type { ContributeSource } from '@/lib/workspace/click-tracking';
import type {
  ContributeIssue,
  ContributeIssuePage,
  ContributeLanguage,
  ContributeSet,
} from '@/lib/workspace/contribute.types';
import { type ConnectedAgents, issueRowOfContribute } from '@/lib/workspace/issue-row';
import type { LimitCounts } from '@/lib/workspace/limit-words';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { IssueStartFacts } from '@/lib/workspace/start-refusals';

const link = 'font-semibold text-link hover:underline';
const NO_QUERY: IssuesQuery = {};
const NONE_TITLE = 'No issues match what you work on. New picks arrive every day.';

/** The list's count as it is now: the page's total, less the issues that left the list since. */
const IssuesTotalContext = createContext<{ total: number | null; setTotal: (total: number) => void } | null>(null);

/** Around the list and the count over it, so the count follows the list. */
export function IssuesTotalProvider({ children }: { children: ReactNode }) {
  const [total, setTotal] = useState<number | null>(null);
  return <IssuesTotalContext.Provider value={{ total, setTotal }}>{children}</IssuesTotalContext.Provider>;
}

/** "38 open issues", live: as the list counts them once it is drawn, the page's total until then. */
export function LiveIssuesCount({ total: read }: { total: number }) {
  const total = useContext(IssuesTotalContext)?.total ?? read;
  return (
    <span data-total={total}>
      {total.toLocaleString('en-US')} open issue{total === 1 ? '' : 's'}
    </span>
  );
}

/** A state of the list in place of its rows: one title, one line, one next step. */
function ListNote({ title, children, name }: { title: string; children?: ReactNode; name: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed px-5 py-8 text-center" data-list-note={name}>
      <span className="font-semibold">{title}</span>
      {children ? <span className="text-sm text-muted-foreground">{children}</span> : null}
    </div>
  );
}

export type ContributeIssueListProps = {
  /** The first page; `undefined` when the API did not answer it, null when it has none for the user. */
  page: ContributeIssuePage | null | undefined;
  /** The agents connected now (the gate's). */
  agents: ConnectedAgents;
  /** The rows' "⋯": false leaves it out. */
  menu?: boolean;
  /** The filters in the address. */
  filter?: IssuesQuery;
  /** Learn is open to the person: "Fix it and teach me" in the rows' menu. */
  learnOpen?: boolean;
  /** GitRanks holds the account: no issues, no Start. */
  held?: boolean;
  /** The person paused contributing: the notice and Resume over the rows. */
  pausedByYou?: boolean;
  /** At the open pull request limit: its notice over the rows, which have no Start. */
  limit?: LimitCounts | null;
  /** What the person works on: their list's issues apart from the others, and why a list-only mode is empty. */
  set?: ContributeSet | null;
  languages?: ContributeLanguage[];
  /** For a refused hosted Start's words. */
  facts?: IssueStartFacts;
  /** The mark on each row's Start, where the page counts its Starts. */
  source?: ContributeSource;
  /** What the list says when nothing matches what the person works on. */
  noneTitle?: string;
  className?: string;
};

/**
 * Contribute's issues for the person, without the tab's head: the list's own notices (the account held, the pause
 * with Resume, the limit), then the rows, live (a taken or started row leaves and the next one fills its place), and
 * "Show 10 more". Or why there are none, each with one next step. A page that places the list outside the tabs gets
 * the same notices.
 */
export function ContributeIssueList({
  page,
  agents,
  menu = true,
  filter = NO_QUERY,
  learnOpen = false,
  held = false,
  pausedByYou = false,
  limit = null,
  set,
  languages = [],
  facts,
  source,
  noneTitle = NONE_TITLE,
  className,
}: ContributeIssueListProps) {
  const router = useRouter();
  let body: ReactNode;
  // Held: the API answers an empty page that is never ranked; nothing is shown and nothing reads it again.
  if (held) {
    body = (
      <ListNote name="held" title="No issues for now">
        Contribute is paused for this account, so no issues are shown.{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
          Write to us
        </a>
      </ListNote>
    );
  } else if (page === undefined) {
    body = (
      <ListNote name="unanswered" title="Issues are not available right now. Try again in a minute.">
        <Button
          type="button"
          variant="link"
          onClick={() => router.refresh()}
          className="h-auto p-0 font-semibold text-link"
        >
          Try again
        </Button>
      </ListNote>
    );
  } else if (page && !page.computedAt && !page.items.length && !isFiltered(filter)) {
    // The first picks are computed after the first way in: the page reads itself again until they are in.
    body = <StillRanking />;
  } else {
    body = (
      <LiveRows
        // Other filters are another list: it starts again at its first 10.
        key={issuesHref(filter)}
        page={page}
        agents={agents}
        menu={menu}
        filter={filter}
        learnOpen={learnOpen}
        limit={limit}
        set={set}
        languages={languages}
        facts={facts}
        source={source}
        noneTitle={noneTitle}
        onLimitReached={() => router.refresh()}
      />
    );
  }
  return (
    <div className={cn('flex flex-col gap-4', className)} data-issue-list="">
      {held ? null : pausedByYou ? (
        <PausedNotice name="paused" text="Contributing is paused, so your agent can't take an issue." />
      ) : null}
      {held || !limit ? null : <LimitNotice {...limit} />}
      {body}
    </div>
  );
}

/** The user's mode works on its own list alone, and waits when it has nothing ready. */
const setOnly = (set: ContributeSet) => (set.mode === 'STACK' ? set.stack.fallback : set.repos.fallback) === 'SET_ONLY';

function LiveRows({
  page,
  agents,
  menu,
  filter,
  learnOpen,
  limit,
  set,
  languages,
  facts,
  source,
  noneTitle,
  onLimitReached,
}: Required<Pick<ContributeIssueListProps, 'agents' | 'menu' | 'filter' | 'learnOpen' | 'languages' | 'noneTitle'>> & {
  page: ContributeIssuePage | null;
  limit: LimitCounts | null;
  set?: ContributeSet | null;
  facts?: IssueStartFacts;
  source?: ContributeSource;
  onLimitReached: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { feed, snapshot } = useLiveFeed(
    page ?? { items: [], total: 0, next: null },
    ISSUES_PAGE_SIZE,
    filterOf(filter),
    root,
  );
  const [growing, startGrowing] = useTransition();
  const setTotal = useContext(IssuesTotalContext)?.setTotal;
  useEffect(() => {
    setTotal?.(snapshot.total);
  }, [setTotal, snapshot.total]);
  const byId = new Map(snapshot.rows.map((row) => [row.issue.issueId, row]));
  const split = set
    ? tiersOf(
        snapshot.rows.map(({ issue }) => issue),
        set.mode,
      )
    : null;
  // The cap ends the list: only once no page is left to read.
  const capped = snapshot.dailyCap?.reached && !snapshot.next ? snapshot.dailyCap : null;
  const first = snapshot.rows[0]?.issue.issueId;

  const rowsOf = (issues: ContributeIssue[], other = false) =>
    issues.length ? (
      <ul
        data-other={other || undefined}
        className={cn('divide-y overflow-hidden rounded-xl border bg-card', other && 'border-dashed')}
      >
        {issues.map(({ issueId }) => {
          const row = byId.get(issueId);
          if (!row) return null;
          return (
            <LiveRowItem key={issueId} row={row}>
              <IssueRow
                issue={issueRowOfContribute(row.issue)}
                side="contribute"
                agents={agents}
                primary={issueId === first}
                control={!limit}
                menu={menu}
                learnOpen={learnOpen}
                live={liveOf(feed, row)}
                facts={facts}
                startSource={source}
                onRefused={(refusal) => {
                  // The limit holds now: the page reads it again and shows its state.
                  if (refusal.code === 'LIMIT_REACHED') onLimitReached();
                }}
              />
            </LiveRowItem>
          );
        })}
      </ul>
    ) : null;

  let empty: ReactNode = null;
  if (!snapshot.rows.length && !snapshot.next && !capped) {
    if (set && set.mode !== 'ALL' && setOnly(set) && !isFiltered(filter)) {
      empty = <SetOnlyEmpty set={set as ContributeSet & { mode: 'STACK' | 'REPOS' }} languages={languages} />;
    } else if (isFiltered(filter)) {
      empty = (
        <ListNote name="filtered" title="No issues match these filters">
          <Link href={'/contribute#issues' as Route} prefetch={false} scroll={false} className={link}>
            Clear the filters
          </Link>
        </ListNote>
      );
    } else {
      empty = (
        <ListNote name="none" title={noneTitle}>
          <Link href={WORKSPACE_PATHS.settingsWork} prefetch={false} className={link}>
            Change what you work on
          </Link>
        </ListNote>
      );
    }
  }

  return (
    <IssueStartsProvider>
      <div ref={root} tabIndex={-1} className="flex flex-col gap-4 outline-none">
        <LiveAnnouncer rows={snapshot.rows} />
        {empty}
        {split && set ? (
          <>
            {split.set.length ? <SetIssuesHeading set={set} /> : null}
            {rowsOf(split.set)}
            {split.other.length ? <OtherIssuesDivider set={set} none={!split.set.length} /> : null}
            {rowsOf(split.other, true)}
          </>
        ) : (
          rowsOf(snapshot.rows.map(({ issue }) => issue))
        )}
        {capped ? <DailyCapEnd cap={capped} /> : null}
        {/* Only while there is more to show: none at the day's cap or the end, whatever the total says. */}
        {snapshot.more && !capped ? (
          <ShowMore
            shown={snapshot.rows.length}
            total={Math.max(snapshot.total, snapshot.rows.length + 1)}
            noun="issue"
            pending={growing}
            onMore={() => startGrowing(() => feed.grow(ISSUES_PAGE_SIZE))}
          />
        ) : null}
      </div>
    </IssueStartsProvider>
  );
}
