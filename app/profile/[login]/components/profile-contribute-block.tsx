import { ArrowRight, BookMarked, CircleCheck, type LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { contributeSource } from '@/lib/contribute/click-tracking';
import { cn } from '@/lib/utils';

/** One issue as the owner's block shows it: where, what, the repository's language, and why it is a good one. */
export type OwnerIssue = {
  repo: string;
  number: number;
  url: string;
  title: string | null;
  /** The repository's language as GitHub names and colours it. */
  language: { name: string; color: string | null } | null;
  why: string | null;
};

/** The owner before they connect (picked from the pool for their languages), or after (their own list's top). */
export type OwnerBlockState = 'not_connected' | 'connected';

export const OWNER_BLOCK_SHOWN = 3;

const n = (value: number) => <span className="font-mono tabular-nums">{value.toLocaleString('en-US')}</span>;

/**
 * One issue, drawn like a repository row: the title, then the repo, its language (colour dot) and why, after `whyIcon`.
 * The owner's Contribute and Learn blocks both list issues this way.
 */
export const OwnerIssueRow: FC<{ issue: OwnerIssue; whyIcon?: LucideIcon }> = ({
  issue,
  whyIcon: WhyIcon = CircleCheck,
}) => (
  <article data-issue={`${issue.repo}#${issue.number}`} className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="min-w-0 font-semibold [overflow-wrap:anywhere] hover:underline"
    >
      {issue.title?.trim() || `Issue #${issue.number}`}
    </a>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className="flex min-w-0 items-center gap-1">
        <BookMarked className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">Repository:</span>
        <span className="truncate">
          {issue.repo} <span className="font-mono text-muted-foreground tabular-nums">#{issue.number}</span>
        </span>
      </span>
      {issue.language ? (
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
            style={{ backgroundColor: issue.language.color ?? undefined }}
            aria-hidden
          />
          {issue.language.name}
        </span>
      ) : null}
      {issue.why ? (
        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
          <WhyIcon className="size-4 shrink-0" aria-hidden />
          {issue.why}
        </span>
      ) : null}
    </div>
  </article>
);

/**
 * GitRanks Contribute on the signed-in owner's own profile, and nobody else's: a suggestion, framed in the "yours"
 * violet so it never reads as part of the profile. Before they connect, three ready issues picked for their languages
 * and the way to connect their agent; after, the top three of their own list and the way to it.
 */
export const ProfileContributeBlock: FC<{
  state: OwnerBlockState;
  issues: OwnerIssue[];
  /** Before connecting: the pool's ready issues now, for the line under the title. */
  readyIssues?: number | null;
  /** Before connecting: the profile's languages the picks were matched to ("TypeScript and JavaScript"). */
  matchedTo?: string;
}> = ({ state, issues, readyIssues, matchedTo }) => {
  if (!issues.length) return null;
  const connected = state === 'connected';

  const lead: ReactNode = connected ? (
    'Picked for you, best first. Your agent fixes one, you approve the pull request.'
  ) : (
    <>
      Picked for your {matchedTo ?? 'languages'} from {readyIssues ? n(readyIssues) : 'the'} open-source issues ready
      for an AI agent today. Connect your agent: it fixes one, you approve, the pull request opens in your name.
    </>
  );

  return (
    <section
      aria-labelledby="profile-contribute"
      data-contribute-block={state}
      {...contributeSource('profile_issues_block')}
      className="flex flex-col gap-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            GitRanks Contribute · Only you see this
          </span>
          <h2 id="profile-contribute" className="text-xl font-semibold tracking-tight text-balance">
            Issues for you to fix
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">{lead}</p>
        </div>
        <Link
          href={(connected ? '/contribute/issues' : '/contribute?start=agent') as Route}
          prefetch={false}
          className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 font-semibold max-sm:min-h-11 max-sm:w-full')}
        >
          {connected ? 'All my issues' : 'Connect my agent'}
          <ArrowRight aria-hidden />
        </Link>
      </div>
      <div className="flex flex-col divide-y rounded-lg border bg-card text-card-foreground">
        {issues.slice(0, OWNER_BLOCK_SHOWN).map((issue) => (
          <OwnerIssueRow key={`${issue.repo}#${issue.number}`} issue={issue} />
        ))}
      </div>
    </section>
  );
};
