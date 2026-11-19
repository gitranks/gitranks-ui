import Link from 'next/link';
import type { ReactNode } from 'react';

import { Pill } from '@/components/pill/pill';
import type { LearnGoalView, LessonHead } from '@/lib/learn/learn.types';
import { levelPhraseOf, sameGoal, wantedOf } from '@/lib/learn/learn-home';
import { writtenForOf } from '@/lib/learn/lesson-format';
import { pullRequestOf } from '@/lib/learn/lesson-public';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 14, 2026", in UTC; empty for a date that does not parse. */
export function madeDayOf(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function Cell({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{term}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

/** "octocat, who also wanted to learn TypeScript (some experience)"; "also" only for the viewer's own goal. */
function MadeFor({ head, goal }: { head: LessonHead; goal: LearnGoalView | null }) {
  const login = head.author.login;
  const who = login ? (
    <Link href={`/profile/${encodeURIComponent(login)}`} prefetch={false} className="font-medium hover:underline">
      {login}
    </Link>
  ) : (
    'A learner'
  );
  const written = head.writtenForGoal;
  if (written) {
    const level = levelPhraseOf(written.level);
    return (
      <>
        {who}, {wantedOf(written, sameGoal(written, goal))} <span className="font-medium">{written.value}</span>
        {level ? ` (${level})` : ''}
      </>
    );
  }
  // Only the words: "learn TypeScript, level Some".
  const parts = writtenForOf(head.writtenFor);
  if (!parts) return <>{who}</>;
  return (
    <>
      {who}, who wanted to {parts.goal}
      {parts.level ? ` (${levelPhraseOf(parts.level)})` : ''}
    </>
  );
}

/**
 * A practice lesson's context, under its title: the issue it came from, who it was made for and what they wanted to
 * learn, when it was made and from which pull request, and what it teaches. `goal`: the viewer's, for "also".
 */
export function PracticeContext({ head, goal }: { head: LessonHead; goal: LearnGoalView | null }) {
  const { issue, issueTitle } = head.subject;
  const pr = pullRequestOf(head);
  const day = madeDayOf(head.publishedAt);
  return (
    <dl
      className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"
      data-lesson-context=""
    >
      {issue ? (
        <Cell term="The issue">
          {issueTitle?.trim() ? `${issueTitle.trim()} ` : 'Issue '}
          <span className="font-mono text-muted-foreground">#{issue}</span>
        </Cell>
      ) : null}
      <Cell term="Made for">
        <MadeFor head={head} goal={goal} />
      </Cell>
      {day || pr ? (
        <Cell term="Made">
          {day}
          {day && pr ? ' · ' : ''}
          {pr ? (
            <>
              from{' '}
              <a href={pr.url} target="_blank" rel="noreferrer" className="text-link hover:underline">
                pull request #{pr.number}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          ) : null}
        </Cell>
      ) : null}
      {head.topics.length ? (
        <Cell term="You learn">
          <span className="flex flex-wrap gap-1.5">
            {head.topics.map((topic) => (
              <Pill key={topic}>{topic}</Pill>
            ))}
          </span>
        </Cell>
      ) : null}
    </dl>
  );
}
