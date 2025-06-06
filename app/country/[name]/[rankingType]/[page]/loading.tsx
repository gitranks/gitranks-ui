import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(364px,1fr))] gap-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton key={index} className="h-52 w-full" />
      ))}
    </div>
  );
}
