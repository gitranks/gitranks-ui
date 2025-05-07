import { AspectRatio } from '@radix-ui/react-aspect-ratio';

import { Page } from '@/components/page/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <Page className="gap-6 flex-col md:flex-row">
      <div className="w-full md:w-3xs xl:w-2xs flex flex-col shrink-0 gap-12">
        <div className="flex flex-row md:flex-col items-center md:items-start gap-4">
          <div className="w-[64] sm:w-[128] md:w-full">
            <AspectRatio ratio={1}>
              <Skeleton className="w-full h-full rounded-full" />
            </AspectRatio>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-[200]" />
            <Skeleton className="h-4 w-[150]" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4  flex grow" />
          <Skeleton className="h-4  flex grow" />
        </div>
      </div>
      <div className="flex-grow flex flex-col gap-6">
        <div className="flex flex-col md:flex-row flex-wrap gap-6">
          <Skeleton className="h-[150px] grow min-w-xs rounded-xl" />
          <Skeleton className="h-[150px] grow min-w-xs rounded-xl" />
        </div>
      </div>
    </Page>
  );
}
