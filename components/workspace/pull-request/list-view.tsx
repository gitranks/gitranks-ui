'use client';

import type { Route } from 'next';
import { useState, useTransition } from 'react';

import { PullRequestListView } from '@/components/workspace/pr-parts/pr-list';
import { learnLessonPath } from '@/lib/learn/paths';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { pullRequestPath } from '@/lib/workspace/paths';
import { moreEndedAction } from '@/lib/workspace/pull-request.actions';
import type { PullRequestList, PullRequestListRow } from '@/lib/workspace/pull-request-page.types';

/** A row's page: the one the API gives (an earlier attempt's, when a later fix of the issue exists), else the issue's. */
function rowHrefOf(row: PullRequestListRow): Route | null {
  if (row.path === undefined) return pullRequestPath({ repo: row.repo, issue: row.issueNumber });
  return row.path?.startsWith('/my/pull-requests/') ? (row.path as Route) : null;
}

/** The person's pull requests, with "Show 20 more" of "Ended" read in place. */
export function PullRequestListPageView({
  list: first,
  now,
  side,
  issuesHref,
}: {
  list: PullRequestList;
  now: Date;
  side: 'learn' | 'contribute';
  issuesHref: Route;
}) {
  const [list, setList] = useState(first);
  const [error, setError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();
  const more = (after: string) =>
    startTransition(async () => {
      setError(null);
      const result = await moreEndedAction(after);
      if (!result.ok || !result.data) {
        setError(result.ok ? contributeErrorMessage('FAILED') : contributeErrorMessage(result.error, result.message));
        return;
      }
      const page = result.data;
      setList((was) => {
        const seen = new Set(was.rows.map((row) => row.attemptId));
        const ended = page.rows.filter((row) => row.group === 'ENDED' && !seen.has(row.attemptId));
        return { ...was, rows: [...was.rows, ...ended], more: page.more };
      });
    });
  return (
    <>
      <PullRequestListView
        list={list}
        now={now}
        side={side}
        issuesHref={issuesHref}
        hrefOf={rowHrefOf}
        lessonHrefOf={(lesson) => learnLessonPath(lesson.slug)}
        onMore={more}
        loadingMore={loading}
      />
      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}
