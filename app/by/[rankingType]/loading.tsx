import { Page } from '@/components/page/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <Page className="max-w-5xl gap-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-[200]" />
        <Skeleton className="h-5 w-full" />
      </div>
    </Page>
  );
}
