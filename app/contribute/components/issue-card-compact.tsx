import { Pill } from './primitives';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { GOOD_FIRST_LABEL, LANGUAGES } from '@/lib/contribute/format';
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
 * why it was picked in place of the labels.
 */
export function IssueCardCompact({ issue, variant = 'card' }: { issue: ContributeIssue; variant?: 'card' | 'pick' }) {
  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);
  const pick = variant === 'pick';

  return (
    <article
      data-issue={issue.issueId}
      className={cn(
        'flex min-w-0 flex-col',
        pick ? 'gap-1 px-4 py-3.5' : 'gap-2 rounded-lg border bg-card px-4 py-3.5',
      )}
    >
      <span className="truncate font-mono text-xs text-muted-foreground">
        {pick ? whereOf(issue) : `${issue.nameWithOwner} · #${issue.number}`}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground hover:underline"
        >
          {title}
        </a>
      ) : (
        <span className="font-semibold text-foreground">{title}</span>
      )}
      {pick ? (
        issue.why?.trim() ? (
          <span className="text-sm text-muted-foreground">Why: {issue.why.trim()}</span>
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
    </article>
  );
}
