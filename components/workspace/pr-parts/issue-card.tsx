import type { Route } from 'next';
import Link from 'next/link';

import { RefChips } from '@/components/workspace/ref-chips';
import { lessonLeadOf } from '@/lib/workspace/pull-request-page';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';

export type PullRequestIssueCardProps = {
  page: Pick<
    PullRequestPage,
    'repo' | 'issueNumber' | 'issueTitle' | 'number' | 'url' | 'hosted' | 'lesson' | 'lessonConfirmed'
  >;
  /** The lesson's page; without it the lesson's title is plain text. */
  lessonHref?: Route | null;
  /** Where "← Pull requests" leads; no link without it. */
  backHref?: Route | null;
};

/**
 * The head of a pull request's page: the way back to the list, then one card with the project and its links (the
 * issue, and the pull request once it is open), the issue's title and the lesson line. A fix with no lesson has no
 * lesson line, and no words about a lesson.
 */
export function PullRequestIssueCard({ page, lessonHref, backHref }: PullRequestIssueCardProps) {
  return (
    <div className="flex flex-col gap-5" data-pr-head="">
      {backHref ? (
        <Link href={backHref} prefetch={false} className="self-start text-sm font-semibold text-link hover:underline">
          ← Pull requests
        </Link>
      ) : null}
      <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <RefChips
            repo={page.repo}
            issue={page.issueNumber}
            pr={page.number !== null ? { number: page.number, url: page.url } : null}
          />
          {page.hosted ? <span data-hosted="">Hosted agent</span> : null}
        </div>
        <h1 className="m-0 text-xl font-semibold text-pretty">{page.issueTitle}</h1>
        {page.lesson ? (
          <p className="m-0 text-sm text-muted-foreground" data-lesson="">
            {lessonLeadOf(page)}{' '}
            {lessonHref ? (
              <Link href={lessonHref} prefetch={false} className="font-medium text-foreground hover:underline">
                {page.lesson.title}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{page.lesson.title}</span>
            )}
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
