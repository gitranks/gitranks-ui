import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex gap-8">
      <Skeleton className="h-14 flex grow" />
      <Skeleton className="h-14 flex grow" />
    </div>
  );
}
