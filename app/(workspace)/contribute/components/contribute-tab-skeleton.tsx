import { Skeleton } from '@/components/ui/skeleton';

/*
 * `/contribute` is home for a member and the landing for everyone else, and its skeleton is drawn before anyone is
 * known, the same HTML for all. So it holds both shapes and the browser picks one in CSS, from what the head's script
 * set on `<html>`: the workspace's tabs guessed (`data-bar-guess`, which needs the session hint and the workspace's bar
 * seen last) draws home's boxes and list; anything else draws the landing's head. A wrong guess errs as the bar's does.
 */

/** Home's shape: the three boxes, the list's heading and lines, five rows. */
function HomeShape() {
  return (
    <div className="hidden flex-col gap-10 [html[data-bar-guess]_&]:flex" data-skeleton-shape="home">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((box) => (
          <Skeleton key={box} className="h-[224px] rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col divide-y overflow-hidden rounded-xl border">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex flex-col gap-2 px-4 py-3.5 sm:px-5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The landing's shape: its head (the title, the line, the button) beside the card of a merged pull request. */
function LandingShape() {
  return (
    <div
      className="flex flex-wrap items-center gap-9 pt-1 pb-4 sm:gap-14 sm:pt-7 [html[data-bar-guess]_&]:hidden"
      data-skeleton-shape="landing"
    >
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-12 w-3/4 max-w-md" />
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="h-11 w-48" />
      </div>
      <Skeleton className="h-64 flex-[1_1_400px] rounded-xl" />
    </div>
  );
}

/** While `/contribute` reads: home's shape for a member, the landing's for anyone else, so nothing jumps for either. */
export function ContributeTabSkeleton() {
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col px-4 pt-7 pb-16"
      aria-busy="true"
      data-contribute-skeleton=""
    >
      <span className="sr-only">Loading</span>
      <HomeShape />
      <LandingShape />
    </main>
  );
}
