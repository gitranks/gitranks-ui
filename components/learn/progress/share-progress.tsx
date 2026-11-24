'use client';

import type { Route } from 'next';
import Link from 'next/link';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { ShareButton } from '@/components/share/share-button';
import type { ProgressShare } from '@/lib/learn/progress/progress.types';

/** Nothing on the Skills page yet: nothing to share. */
export const SHARE_NOT_YET_TEXT = 'You can share your Skills page once it has something to show.';

const LINE = 'max-w-xs text-sm text-muted-foreground max-sm:max-w-none sm:text-right';
const LINK = 'font-medium text-link hover:underline';

/**
 * Your progress' Share, by the viewer's Skills page: while everyone can see it, its link and "Copy link"; while only
 * they can, a line that says so and leads to the page, where they can show it; while nothing is on it, one line.
 */
export function ShareProgress({ share }: { share: ProgressShare }) {
  const page = share.path as Route;
  if (share.state === 'not-yet') {
    return (
      <p data-share="not-yet" className={LINE}>
        {SHARE_NOT_YET_TEXT}
      </p>
    );
  }
  if (share.state === 'hidden') {
    return (
      <p data-share="hidden" className={LINE}>
        Only you can see your Skills page.{' '}
        <Link href={page} prefetch={false} className={LINK}>
          Open it
        </Link>{' '}
        to show it to everyone.
      </p>
    );
  }
  return (
    <div
      data-share="public"
      className="flex max-w-xs flex-col items-stretch gap-2 max-sm:max-w-none sm:items-end"
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest('button')) {
          reportLearnEvent({ kind: 'learn_click', event: 'progress_share', source: 'learn_progress' });
        }
      }}
    >
      <ShareButton href={share.path} label="Copy link" title="Skills" className="min-h-11 font-semibold sm:min-h-10" />
      <p className={LINE}>
        Everyone can see your{' '}
        <Link href={page} prefetch={false} className={LINK}>
          Skills page
        </Link>
        .
      </p>
    </div>
  );
}
