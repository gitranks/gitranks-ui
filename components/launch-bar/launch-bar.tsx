import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SiProducthunt } from 'react-icons/si';

import {
  LAUNCH_BAR_CUE,
  LAUNCH_BAR_LEAD,
  LAUNCH_BAR_SCRIPT,
  LAUNCH_BAR_TAIL,
  PRODUCT_HUNT_BARS,
} from './launch-bar.consts';
import { LaunchBarClock, LaunchBarDismiss, ProductHuntBarLink } from './launch-bar-dismiss';
import { contributeSource } from '@/lib/contribute/click-tracking';

/** In the head: picks the bar before it paints, and hides it where it should not show (see `LAUNCH_BAR_SCRIPT`). */
export function LaunchBarScript() {
  return <script dangerouslySetInnerHTML={{ __html: LAUNCH_BAR_SCRIPT }} />;
}

/**
 * The announcement above the header, on every page: all three bars are in the HTML, and the `data-launch-bar`
 * attribute on `<html>` shows the one for this minute, or none, and moves on at the switch in a tab left open. Each
 * is an `<aside>`, so tools that copy a page's main
 * text (directory listings, readers) skip it.
 */
export function LaunchBar() {
  return (
    <>
      <ProductHuntBar bar="ph-soon" />
      <ProductHuntBar bar="ph-live" />
      <ContributeBar />
      <LaunchBarClock />
    </>
  );
}

/**
 * GitRanks Contribute on Product Hunt: before the launch, then on it. Product Hunt's orange as a tint, its logo and a
 * chip (the date, then a live dot); one link to Product Hunt and an X. Phones show the logo, the lead and the chip,
 * the cue comes in from `md`, the sentence from `xl`.
 */
function ProductHuntBar({ bar }: { bar: 'ph-soon' | 'ph-live' }) {
  const copy = PRODUCT_HUNT_BARS[bar];
  return (
    <aside
      data-launch-bar-root={bar}
      aria-label="Announcement"
      className="border-b border-producthunt/35 bg-producthunt/13"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 text-sm">
        <ProductHuntBarLink
          bar={bar}
          href={copy.href}
          className="group flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <SiProducthunt aria-hidden className="size-5 shrink-0 text-producthunt" />
          <span className="min-w-0 truncate font-semibold text-foreground">{copy.lead}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-producthunt-strong px-2 text-[11px] leading-5 font-semibold tracking-wide text-white uppercase">
            {bar === 'ph-live' && (
              <span aria-hidden className="relative flex size-1.5">
                <span className="absolute inline-flex size-full rounded-full bg-white opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-white" />
              </span>
            )}
            <span className="max-md:hidden">{copy.chip}</span>
            <span className="md:hidden">{copy.chipShort}</span>
          </span>
          {/* Takes only the room left over, so it never squeezes the lead. */}
          <span className="min-w-0 flex-1 basis-0 truncate text-muted-foreground max-xl:hidden">{copy.tail}</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-producthunt/60 bg-background px-3 py-0.5 font-semibold text-foreground group-hover:border-producthunt max-md:hidden">
            {copy.cue}
            <ArrowRight aria-hidden className="size-4" />
          </span>
          <span className="sr-only"> (opens Product Hunt in a new tab)</span>
        </ProductHuntBarLink>
        <LaunchBarDismiss bar={bar} />
      </div>
    </aside>
  );
}

/**
 * Contribute's own bar: one link into Contribute, and an X that hides it in this browser for good. Phones show the lead
 * alone; the cue comes in from `md`, and the sentence after the lead from `xl`, where it fits on the line. Also hidden
 * on Contribute's pages and once this browser has opened one.
 */
function ContributeBar() {
  return (
    <aside data-launch-bar-root="contribute" aria-label="Announcement" className="border-b bg-muted/40">
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
        <LaunchBarDismiss bar="contribute" />
      </div>
    </aside>
  );
}
