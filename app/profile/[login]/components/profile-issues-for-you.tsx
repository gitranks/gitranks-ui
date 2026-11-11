import Link from 'next/link';

import { IssueCardCompact } from '@/app/contribute/components/issue-card-compact';
import { contributeSource } from '@/lib/contribute/click-tracking';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { PROFILE_ISSUES_MAX } from '@/lib/contribute/profile-issues';

/** The block itself: up to three compact cards and the way to the rest; nothing at all without issues. */
export function ProfileIssuesBlock({ issues }: { issues: ContributeIssue[] }) {
  if (!issues.length) return null;

  return (
    <section
      aria-labelledby="profile-issues-for-you"
      {...contributeSource('profile_issues_block')}
      className="flex flex-col gap-3.5 rounded-xl border border-violet-200 bg-violet-50/50 px-5 py-4 dark:border-violet-900 dark:bg-violet-950/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="profile-issues-for-you" className="text-lg font-semibold">
            Issues for you
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Only you see this. Picked from active repos by your languages and topics.
          </p>
        </div>
        <Link href="/contribute/issues" prefetch={false} className="text-sm font-semibold text-primary hover:underline">
          See all →
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {issues.slice(0, PROFILE_ISSUES_MAX).map((issue) => (
          <IssueCardCompact key={issue.issueId} issue={issue} />
        ))}
      </div>
    </section>
  );
}
