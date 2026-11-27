import type { Metadata } from 'next';

import { INTERVIEWS_COLUMN } from './column';

/** An Interviews page not built yet is never indexed. */
export const INTERVIEWS_PLACEHOLDER_METADATA: Metadata = {
  title: 'GitRanks Interviews',
  robots: { index: false, follow: false },
};

/**
 * What an Interviews address shows until its page is built: the page's name in Interviews' reading column. Only the
 * people Interviews is open to reach it.
 */
export function InterviewsPlaceholder({ title }: { title: string }) {
  return (
    <main data-interviews-placeholder className={INTERVIEWS_COLUMN}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-base text-muted-foreground">This page is on its way.</p>
      </div>
    </main>
  );
}
