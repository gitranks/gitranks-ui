'use client';

import { Check, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { Button } from '@/components/ui/button';
import type { LearnProgressCounts } from '@/lib/learn/progress/progress.types';
import { type ShareState, shareStateOf } from '@/lib/learn/public-progress/public-progress';

/** The helper line under a Share button. */
const SHARE_TEXT = 'Copies your public link. Posted anywhere, it shows a card with your numbers.';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Why the public page counts less than Your progress, said of the count that differs: the lessons first, then the new
 * things, then the merged pull requests and their repositories. Null when they are the same.
 */
export function differTextOf(counts: LearnProgressCounts, publicCounts: LearnProgressCounts): string | null {
  if (publicCounts.lessonsPassed !== counts.lessonsPassed) {
    return `Your public page counts ${plural(publicCounts.lessonsPassed, 'lesson', 'lessons')}. A lesson is counted there once its pull request is open, and a practice lesson once you share your result.`;
  }
  if (publicCounts.newThings !== counts.newThings) {
    return `Your public page counts ${plural(publicCounts.newThings, 'new thing', 'new things')} learned. It counts the new things of the results that are public.`;
  }
  if (publicCounts.prsMerged !== counts.prsMerged || publicCounts.reposHelped !== counts.reposHelped) {
    return `Your public page counts ${plural(publicCounts.prsMerged, 'pull request', 'pull requests')} merged in ${plural(publicCounts.reposHelped, 'repository', 'repositories')}. A merged pull request is counted there while its repository is public.`;
  }
  return null;
}

/** No public record yet: nothing to share. */
export const NO_RECORD_TEXT = 'You can share once your first pull request opens, or after you share a practice result.';

/**
 * Your progress' Share control: one outline button that copies the viewer's public link (the login they are signed in
 * with), "Link copied" once it did. Nothing before a first pass; a line and no button before anything is public; a
 * second line when the public page counts less. When the browser refuses to copy, the link shows in a field to select,
 * with Copy to try again.
 */
export function ShareProgress({
  url,
  counts,
  publicCounts,
}: {
  /** The viewer's public page. */
  url: string;
  counts: LearnProgressCounts;
  publicCounts: LearnProgressCounts | null;
}) {
  const state: ShareState = shareStateOf(counts, publicCounts);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'refused'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (state === 'nothing') return null;
  if (state === 'no-record') {
    return (
      <p data-share="no-record" className="max-w-xs text-sm text-muted-foreground max-sm:max-w-none">
        {NO_RECORD_TEXT}
      </p>
    );
  }

  const press = async () => {
    reportLearnEvent({ kind: 'learn_click', event: 'progress_share', source: 'learn_progress' });
    try {
      await navigator.clipboard.writeText(url);
      setCopy('copied');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopy('idle'), 2000);
    } catch {
      setCopy('refused');
    }
  };

  return (
    <div data-share={state} className="flex max-w-xs flex-col items-stretch gap-2 max-sm:max-w-none sm:items-end">
      <Button type="button" variant="outline" onClick={press} className="min-h-11 font-semibold sm:min-h-10">
        {copy === 'copied' ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
        {copy === 'copied' ? 'Link copied' : copy === 'refused' ? 'Copy' : 'Share your progress'}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copy === 'copied' ? 'Link copied' : ''}
      </span>
      {copy === 'refused' ? (
        <input
          readOnly
          value={url}
          aria-label="Your public link"
          onFocus={(event) => event.currentTarget.select()}
          className="h-10 w-full rounded-md border bg-background px-3 font-mono text-xs"
        />
      ) : null}
      <p className="text-sm text-muted-foreground sm:text-right">
        {SHARE_TEXT}
        {state === 'differ' && publicCounts ? ` ${differTextOf(counts, publicCounts) ?? ''}` : null}
      </p>
    </div>
  );
}
