import { PageGrid } from '@/components/grid/grid';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageGrid>
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton key={index} className="h-52 w-full" />
      ))}
    </PageGrid>
  );
}
