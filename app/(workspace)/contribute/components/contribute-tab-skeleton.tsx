import { Skeleton } from '@/components/ui/skeleton';

/** While the Contribute tab reads: its head, the four number tiles, and five rows. */
export function ContributeTabSkeleton() {
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-7 pb-16"
      aria-busy="true"
      data-contribute-skeleton=""
    >
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-prose" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-40" />
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
    </main>
  );
}
