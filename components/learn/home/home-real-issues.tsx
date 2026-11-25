'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import { PHONE_LINK } from '@/components/workspace/phone-link';
import { PullRequestListRowView } from '@/components/workspace/pr-parts/pr-list';
import { type IssuesRow, rowLessonOf, rowsAfterSkip } from '@/lib/learn/issues';
import { learnLessonPath } from '@/lib/learn/paths';
import { HOME_REAL_WORDS, myFixPathOf } from '@/lib/learn/real-issues';
import { cn } from '@/lib/utils';
import { type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';
import type { LearnIssueLesson, PullRequestListRow } from '@/lib/workspace/pull-request-page.types';

/*
 * Learn home's "Real issues": one row for each fix of the person's that has not ended, as their list of pull requests
 * draws it, then the five issues of their list, masked, with their lesson lines. A skipped or gone row leaves, in
 * place. Left out with nothing in it: the third box already says so.
 */

const lessonHrefOf = (lesson: LearnIssueLesson): Route => learnLessonPath(lesson.slug);

export function HomeRealIssues({
  fixes,
  issues: given,
  reads,
  now,
}: {
  fixes: readonly PullRequestListRow[];
  issues: readonly IssuesRow[];
  reads: MaskedListReads | null;
  /** The moment the page was drawn: the rows' "Started 2 hours ago". */
  now: Date;
}) {
  const [issues, setIssues] = useState(given);
  const skipped = useRef(new Set<string>());
  if (!fixes.length && !issues.length) return null;
  const leave = (id: string) => setIssues((was) => was.filter((row) => row.issue.id !== id));
  // A skip's place takes a row of the person's list not on the screen, with its lesson line; with none, the skipped
  // row leaves. The skip's own next issue comes without its lesson, so it is not taken.
  const replace = (id: string) => {
    skipped.current.add(id);
    setIssues((was) => rowsAfterSkip(was, id, given, { leftOut: skipped.current }));
  };
  return (
    <section className="flex flex-col gap-4" aria-labelledby="real-issues" data-home-section="real-issues">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="real-issues" className="m-0 text-xl font-semibold">
          {HOME_REAL_WORDS.title}
        </h2>
        <Link
          href={HOME_REAL_WORDS.allHref}
          prefetch={false}
          className={cn('text-sm font-semibold text-link hover:underline', PHONE_LINK)}
        >
          {HOME_REAL_WORDS.all}
        </Link>
      </div>
      <MaskedList from="learn" pageFrom="learn" reads={reads ?? NO_MASKED_READS} foot={issues.length > 0}>
        <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
          {fixes.map((row) => (
            <li key={row.attemptId} data-home-fix="">
              <PullRequestListRowView row={row} now={now} href={myFixPathOf(row)} lessonHrefOf={lessonHrefOf} />
            </li>
          ))}
          {issues.map((row) => (
            <li key={row.issue.id} data-home-issue="" data-learn-only={row.learnOnly ? '' : undefined}>
              <MaskedListRow
                issue={row.issue}
                full={row.full}
                lesson={rowLessonOf(row)}
                onReplace={() => replace(row.issue.id)}
                onLeave={() => leave(row.issue.id)}
              />
            </li>
          ))}
        </ul>
      </MaskedList>
    </section>
  );
}
