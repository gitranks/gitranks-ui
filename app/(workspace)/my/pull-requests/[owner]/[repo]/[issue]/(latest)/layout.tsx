import type { ReactNode } from 'react';

/** The pull request's page, by repo and issue: the viewer's newest attempt on the issue, and its runs' addresses. */
export default function PullRequestLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16">{children}</main>;
}
