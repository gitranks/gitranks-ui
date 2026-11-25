'use client';

import {
  ContributeIssueList,
  type ContributeIssueListProps,
  NONE_FITS,
} from '@/app/(workspace)/contribute/components/issue-list';
import { AddLanguageButton } from '@/components/contribute/start/first-issue-step';

/**
 * The second step's list, or in its place, when nothing fits, the box with "Add a language" (which opens the step's
 * languages dialog), in the words Contribute home uses.
 */
export function FirstIssueList({ none, ...list }: Omit<ContributeIssueListProps, 'noneTitle'> & { none: boolean }) {
  if (!none) return <ContributeIssueList {...list} noneTitle={NONE_FITS.title} />;
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center"
      data-list-note="none"
    >
      <span className="font-semibold">{NONE_FITS.title}</span>
      <span className="text-sm text-muted-foreground">{NONE_FITS.text}</span>
      <AddLanguageButton />
    </div>
  );
}
