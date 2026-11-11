import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { LAUNCH_BAR_CUE, LAUNCH_BAR_LEAD, LAUNCH_BAR_SCRIPT, LAUNCH_BAR_TAIL } from './launch-bar.consts';
import { LaunchBarDismiss } from './launch-bar-dismiss';
import { contributeSource } from '@/lib/contribute/click-tracking';

/** In the head: hides the bar before it paints where it should not show (see `LAUNCH_BAR_SCRIPT`). */
export function LaunchBarScript() {
  return <script dangerouslySetInnerHTML={{ __html: LAUNCH_BAR_SCRIPT }} />;
}

/**
 * The announcement above the header, on every page: one link into Contribute, and an X that hides it in this browser
 * for good. Phones show the lead alone, the cue comes in from `md`, and the sentence after the lead from `xl`, where it fits on the line. Hidden on Contribute's pages and once this
 * browser has opened one, by the `data-launch-bar` attribute on `<html>`.
 */
export function LaunchBar() {
  return (
    <div data-launch-bar-root className="border-b bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 text-sm">
        <Link
          href="/contribute"
          prefetch={false}
          {...contributeSource('top_bar')}
          className="group flex min-h-9 min-w-0 flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-md:min-h-11"
        >
          <span className="shrink-0 rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            New
          </span>
          <span className="min-w-0 truncate">
            <span className="font-medium text-foreground">{LAUNCH_BAR_LEAD}</span>
            <span className="text-muted-foreground max-xl:hidden"> {LAUNCH_BAR_TAIL}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-link group-hover:underline max-md:hidden">
            {LAUNCH_BAR_CUE}
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
        <LaunchBarDismiss />
      </div>
    </div>
  );
}
