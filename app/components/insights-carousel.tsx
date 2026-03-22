'use client';

import { format } from 'date-fns';
import Autoplay from 'embla-carousel-autoplay';
import { memo, useEffect, useState } from 'react';

import InsightText from './insight-text';
import { Link } from '@/components/link/link';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchInsights } from '@/graphql/helpers/fetch-insights';
import type { InsightsQuery } from '@/types/generated/graphql';

const InsightsCarousel = () => {
  const [, setApi] = useState<CarouselApi>();
  // const [current, setCurrent] = useState(0);
  // const [count, setCount] = useState(0);
  const [insights, setInsights] = useState<InsightsQuery['insights']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { insights: insightsData } = await fetchInsights({ skip: 0, limit: 5 });

      if (insightsData?.length) {
        setInsights(insightsData);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // useEffect(() => {
  //   if (!api) {
  //     return;
  //   }

  //   const scrollSnapList = api.scrollSnapList();
  //   setCount(scrollSnapList?.length ?? 0);
  //   setCurrent(api.selectedScrollSnap() + 1);

  //   api.on('select', () => {
  //     setCurrent(api.selectedScrollSnap() + 1);
  //   });
  // }, [api]);

  if (loading) {
    return (
      <div className="flex w-full h-[132px] flex-col gap-3 mt-3">
        <Skeleton className="w-full h-[16px]" />
        <Skeleton className="w-full h-[16px]" />
        <Skeleton className="w-full h-[16px]" />
      </div>
    );
  }

  if (!insights?.length) {
    return (
      <div className="flex w-full py-6 justify-center text-sm text-muted-foreground">
        We are reworking insights and we will have new insights soon.
      </div>
    );
  }

  return (
    <Carousel
      className="w-full"
      plugins={[Autoplay({ delay: 12000 })]}
      opts={{ align: 'start', loop: true }}
      setApi={setApi}
    >
      <div className="relative mb-4">
        <div className="hidden md:block absolute inset-0 -rotate-6 scale-y-[1.6] -translate-x-10 pointer-events-none bg-landing-page-gradient-start-color rounded-[100%]" />
        <CarouselContent>
          {insights?.map((insight) => (
            <CarouselItem key={insight.id} className="flex items-center">
              <Card className="bg-transparent border-0 shadow-none py-0">
                <CardContent className="flex flex-col justify-center px-0 gap-1.5">
                  <InsightText insight={insight} />
                  <div className="flex justify-between items-center gap-2 text-sm text-muted-foreground">
                    {insight.replies.length > 0 ? (
                      <Link href={`/insights/${insight.id}`} className="text-sm text-muted-foreground">
                        Show {insight.replies.length} replies
                      </Link>
                    ) : (
                      <div />
                    )}
                    <div>{format(new Date(insight.createdAt), "MMM d',' h:mm a")}</div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>

      {/* <div className="flex items-center justify-between relative z-1">
        <div className="flex items-center gap-2">
          <CarouselPrevious className="static translate-none" />
          <CarouselNext className="static translate-none" />
        </div>
        <div className="text-sm text-muted-foreground">
          {current} / {count}
        </div>
      </div> */}
    </Carousel>
  );
};

export default memo(InsightsCarousel);
