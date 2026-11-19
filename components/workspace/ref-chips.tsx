import { CircleDot, GitPullRequest } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { githubUrlOf } from '@/lib/workspace/attempt-format';

const CHIP =
  'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border bg-card px-1.5 font-mono text-xs font-medium whitespace-nowrap text-foreground/80 transition-colors hover:bg-accent hover:text-foreground';

/** One chip: GitHub's page in a new tab, or plain text when there is no page to open. */
function Chip({ href, icon, children }: { href: string | null; icon: ReactNode; children: ReactNode }) {
  if (!href) {
    return (
      <span className={cn(CHIP, 'hover:bg-card hover:text-foreground/80')}>
        {icon}
        {children}
      </span>
    );
  }
  return (
    <a className={CHIP} href={href} target="_blank" rel="noopener noreferrer">
      {icon}
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">(opens GitHub)</span>
    </a>
  );
}

/**
 * "This is the issue, this is the pull request" (decision 5): the repo in mono, then `Issue #N ↗` and, when one
 * exists, `PR #N ↗`, both to GitHub in a new tab; then `children` (the Learn pill, a state). The row's title opens our
 * page. With no repo the chips are plain text. They wrap under the repo on a phone.
 */
export function RefChips({
  repo,
  issue,
  pr,
  children,
  className,
}: {
  /** `owner/name`; null: "a repo". */
  repo: string | null;
  issue: number | null;
  pr?: { number: number; url?: string | null } | null;
  children?: ReactNode;
  className?: string;
}) {
  // Only a name of GitHub's shape becomes a link; anything else stays text.
  const base = repo && /^[\w.-]+\/[\w.-]+$/.test(repo) ? `https://github.com/${repo}` : null;
  const icon = 'size-3';
  return (
    <span
      data-refs=""
      className={cn('flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-xs text-muted-foreground', className)}
    >
      <span className="text-sm">{repo || 'a repo'}</span>
      {issue ? (
        <Chip href={base ? `${base}/issues/${issue}` : null} icon={<CircleDot aria-hidden="true" className={icon} />}>
          Issue #{issue}
        </Chip>
      ) : null}
      {pr ? (
        <Chip
          href={githubUrlOf(pr.url ?? '') ?? (base ? `${base}/pull/${pr.number}` : null)}
          icon={<GitPullRequest aria-hidden="true" className={icon} />}
        >
          PR #{pr.number}
        </Chip>
      ) : null}
      {children ? <span className="contents font-sans">{children}</span> : null}
    </span>
  );
}
