'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { IssueCard } from '@/app/contribute/components/issue-card';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { PROFILE_ISSUES_MAX, type ProfileIssuesAnswer, profileIssuesUrl } from '@/lib/contribute/profile-issues';
import { loginFromPath } from '@/utils/login-from-path';

/**
 * "Issues for you", on the signed-in owner's own profile. The page is cached for everyone, so the session is read here,
 * in the browser, and the issues asked for only by the owner, after the page has loaded: nobody else waits for them
 * or asks. Nothing renders until there are issues to show.
 */
export function ProfileIssuesForYou({ login }: { login: string }) {
  const { data: session } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const url = profileIssuesUrl(viewer, loginFromPath(login));
  const [issues, setIssues] = useState<ContributeIssue[]>([]);

  useEffect(() => {
    setIssues([]);
    if (!url) return;

    let live = true;
    fetch(url)
      .then((res) => (res.ok ? (res.json() as Promise<Partial<ProfileIssuesAnswer>>) : null))
      .then((data) => {
        if (live && Array.isArray(data?.issues)) setIssues(data.issues);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [url]);

  return <ProfileIssuesBlock issues={issues} />;
}

/** The block itself: up to three compact cards and the way to the rest; nothing at all without issues. */
export function ProfileIssuesBlock({ issues }: { issues: ContributeIssue[] }) {
  if (!issues.length) return null;

  return (
    <section
      aria-labelledby="profile-issues-for-you"
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
          <IssueCard key={issue.issueId} issue={issue} variant="compact" />
        ))}
      </div>
    </section>
  );
}
