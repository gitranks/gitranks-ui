import { Skeleton } from '@/components/ui/skeleton';

/** While a Contribute page reads the user's data. */
export function ContributePageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/** While a contribution's session reads, beside its sessions. */
export function ContributeSessionSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
