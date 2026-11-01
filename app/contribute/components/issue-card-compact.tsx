import type { RefObject } from 'react';

import { GONE, IssueLiveStatus, isGone } from './issue-live-status';
import { Pill } from './primitives';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { GOOD_FIRST_LABEL, LANGUAGES } from '@/lib/contribute/format';
import type { LiveStatus } from '@/lib/contribute/live-issues';
import { cn } from '@/lib/utils';

/** "repo · #n · language · size M", what is known of it. */
const whereOf = (issue: ContributeIssue) =>
  [
    issue.nameWithOwner,
    `#${issue.number}`,
    issue.language ? LANGUAGES[issue.language] : null,
    issue.size ? `size ${issue.size}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * One issue picked for the user, small: where, what and the labels, without Skip. For the profile block, which loads
 * none of Contribute's actions. `pick`: a row of Overview's "Up next", with the language and size where it is, and
 * why it was picked in place of the labels. `live`: where the issue stands now, for a row of a live list; once it is
 * taken (or the user's own agent is on it) the card says so, dimmed, its link off.
 */
export function IssueCardCompact({
  issue,
  variant = 'card',
  live,
  cardRef,
  statusRef,
}: {
  issue: ContributeIssue;
  variant?: 'card' | 'pick';
  live?: { status: LiveStatus; attemptId: string | null };
  cardRef?: RefObject<HTMLElement | null>;
  statusRef?: RefObject<HTMLParagraphElement | null>;
}) {
  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);
  const pick = variant === 'pick';
  const gone = isGone(live?.status);

  return (
    <article
      ref={cardRef}
      data-issue={issue.issueId}
      data-gone={gone || undefined}
      {...(live ? { 'data-live-focus': '', tabIndex: -1 } : {})}
      className={cn(
        'flex min-w-0 flex-col',
        pick ? 'gap-1 px-4 py-3.5' : 'gap-2 rounded-lg border bg-card px-4 py-3.5',
        live && 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
      )}
    >
      <span className={cn('truncate font-mono text-xs text-muted-foreground', gone && GONE)}>
        {pick ? whereOf(issue) : `${issue.nameWithOwner} · #${issue.number}`}
      </span>
      {url ? (
        // Kept the same element once the issue is gone, its link off: the focus can still be moved off it.
        <a
          href={gone ? undefined : url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('font-semibold text-foreground', gone ? GONE : 'hover:underline')}
        >
          {title}
        </a>
      ) : (
        <span className={cn('font-semibold text-foreground', gone && GONE)}>{title}</span>
      )}
      {pick ? (
        issue.why?.trim() ? (
          <span className={cn('text-sm text-muted-foreground', gone && GONE)}>Why: {issue.why.trim()}</span>
        ) : null
      ) : issue.labels.length || issue.language ? (
        <div className="flex flex-wrap gap-1.5">
          {issue.labels.slice(0, 2).map((label) => (
            <Pill key={label} tone={GOOD_FIRST_LABEL.test(label) ? 'green' : 'neutral'}>
              {label}
            </Pill>
          ))}
          {issue.language ? <Pill>{LANGUAGES[issue.language]}</Pill> : null}
        </div>
      ) : null}
      {live ? <IssueLiveStatus ref={statusRef} status={live.status} attemptId={live.attemptId} /> : null}
    </article>
  );
}
