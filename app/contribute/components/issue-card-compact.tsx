import { Pill } from './primitives';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { GOOD_FIRST_LABEL, LANGUAGES } from '@/lib/contribute/format';

/**
 * One issue picked for the user, small: where, what and the labels, without Skip. For the profile block, which loads
 * none of Contribute's actions.
 */
export function IssueCardCompact({ issue }: { issue: ContributeIssue }) {
  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);

  return (
    <article data-issue={issue.issueId} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card px-4 py-3.5">
      <span className="truncate font-mono text-[12.5px] text-muted-foreground">
        {issue.nameWithOwner} · #{issue.number}
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
      {issue.labels.length || issue.language ? (
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
