'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Whether the browser's path is a Learn pull request's Lesson view. */
export const isLessonPath = (pathname: string) => /\/lesson\/?$/.test(pathname);

/**
 * Under the header, the view the address names: the Lesson view (`…/lesson`) alone, its own rail inside it; else the
 * Pull request view's grid, the sessions, the repo's rules and the maintainers' notes around the session shown. The
 * layout draws both sides once, and keeps them as the person moves between the views and the sessions.
 */
export function PullRequestBody({
  grid,
  paneClass,
  sessions,
  rules,
  notes,
  children,
}: {
  grid: string;
  paneClass: string;
  sessions: ReactNode;
  rules: ReactNode;
  notes: ReactNode;
  children: ReactNode;
}) {
  if (isLessonPath(usePathname())) return <div data-lesson-view="">{children}</div>;
  return (
    <div className={grid}>
      {sessions}
      <div className={paneClass}>{children}</div>
      {rules}
      {notes}
    </div>
  );
}
