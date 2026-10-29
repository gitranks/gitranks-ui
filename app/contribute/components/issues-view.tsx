import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ContributeNotices } from './contribute-notices';
import { IssueCard } from './issue-card';
import { filterOf, type IssuesQuery, issuesHref, issuesQueryOf } from './issues-filter';
import { IssuesFilters } from './issues-filters';
import { Meter } from './primitives';
import { ReviewsReady } from './reviews-ready';
import { loadAttempts, loadContribute, loadIssues } from '@/lib/contribute/contribute.data';
import type { ContributeAttempt, ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';
import { contributeNoticesOf } from '@/lib/contribute/contribute-state';
import { dayLabel, relativeLabel, usd } from '@/lib/contribute/format';

export async function IssuesView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = issuesQueryOf(await searchParams);
  const [view, page, reviews] = await Promise.all([
    loadContribute(),
    loadIssues(filterOf(query), query.after),
    loadAttempts('REVIEW', 5),
  ]);
  if (!view) notFound();
  return <IssuesScreen view={view} page={page} query={query} reviews={reviews} />;
}

const filtered = (query: IssuesQuery) => !!(query.language || query.kind || query.size);

function Empty({ title, text }: { title: string; text: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed px-5 py-8 text-center">
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * The feed: issues picked for the user, with filters and Skip. `page` is `undefined` when the API does not answer the
 * feed yet, and `null` when it has none for the user.
 */
export function IssuesScreen({
  view,
  page,
  query,
  now,
  reviews,
}: {
  view: ContributeView;
  page: ContributeIssuePage | null | undefined;
  query: IssuesQuery;
  now?: Date;
  /** The attempts waiting for the user's review; `undefined` while the API does not answer them. */
  reviews?: ContributeAttempt[];
}) {
  const spend = view.contributor?.spend;
  const settings = view.contributor?.settings;

  let feed: React.ReactNode;
  if (page === undefined) {
    feed = <Empty title="Issues are not available yet" text="The feed is coming soon. Check back shortly." />;
  } else if (!page?.items.length) {
    feed = filtered(query) ? (
      <Empty
        title="No issues match these filters"
        text={
          <Link href="/contribute/issues" prefetch={false} className="font-semibold text-primary">
            Clear the filters
          </Link>
        }
      />
    ) : (
      <Empty
        title="No issues picked for you yet"
        text={
          <>
            New picks arrive every day. Widen what you work on in{' '}
            <Link href="/contribute/settings#work" prefetch={false} className="font-semibold text-primary">
              Settings
            </Link>
            .
          </>
        }
      />
    );
  } else {
    feed = (
      <>
        {page.items.map((issue) => (
          <IssueCard key={issue.issueId} issue={issue} />
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          {query.after ? (
            <Link href={issuesHref({ ...query, after: undefined }) as Route} prefetch={false} className="text-primary">
              ← Back to the best matches
            </Link>
          ) : (
            <span />
          )}
          {page.next ? (
            <Link
              href={issuesHref({ ...query, after: page.next }) as Route}
              prefetch={false}
              className="font-semibold text-primary"
            >
              More issues →
            </Link>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <ReviewsReady attempts={reviews} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-[28px] font-bold tracking-tight">Issues for you</h1>
              <span className="text-sm text-muted-foreground" data-total={page?.total ?? ''}>
                {page
                  ? `${page.total.toLocaleString('en-US')} open issue${page.total === 1 ? '' : 's'} match your languages and topics. Maintainers agreed each one should be fixed.`
                  : 'Open issues that match your languages and topics, in repos that merge outside work.'}
                {page?.computedAt ? ` Picked ${relativeLabel(page.computedAt, now)}.` : ''}
              </span>
            </div>
            <IssuesFilters query={query} />
          </div>
          {feed}
        </div>
        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
          <section className="flex flex-col gap-2.5 rounded-xl border bg-card p-4.5">
            <h2 className="text-[15px] font-semibold">This cycle</h2>
            {spend && settings ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold">{usd(spend.cycleUsd)}</span>
                  <span className="text-sm text-muted-foreground">of {usd(settings.cycleCapUsd)}</span>
                </div>
                <Meter value={spend.cycleUsd} max={settings.cycleCapUsd} label="Spent this cycle" />
                <span className="text-sm text-muted-foreground">
                  Renews {dayLabel(spend.cycleEnd)}.
                  {spend.nextAttemptAt ? ` The next attempt can start ${relativeLabel(spend.nextAttemptAt, now)}.` : ''}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Nothing is spent until a key is connected.{' '}
                <Link href="/contribute/connect" prefetch={false} className="font-semibold text-primary">
                  Connect Claude
                </Link>
              </span>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border bg-card p-4.5">
            <h2 className="text-[15px] font-semibold">How picks work</h2>
            <span className="text-sm text-muted-foreground">
              Issues come from active repos that merge outside work, matched to your languages and topics. Skip one and
              it is not picked for you again. Size is shown where it is known.
            </span>
          </section>
        </aside>
      </div>
    </>
  );
}
