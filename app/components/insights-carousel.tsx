'use client';
import Autoplay from 'embla-carousel-autoplay';
import { memo, useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchInsights } from '@/graphql/helpers/fetch-insights';
import { InsightCategory, type InsightsQuery } from '@/types/generated/graphql';

import InsightText from './insight-text';

const InsightCategoryTitle: Record<InsightCategory, string> = {
  [InsightCategory.CountryScorePerProfile]: 'Country Score',
  [InsightCategory.CountryTrends]: 'Country Trends',
  [InsightCategory.DominatingCountry]: 'Country Leader',
  [InsightCategory.DominatingGlobal]: 'Global Leader',
  [InsightCategory.HotSpot]: 'Hot Spot',
  [InsightCategory.MinScore]: 'Min Score',
  [InsightCategory.MonthlyScoreChange]: 'Monthly Change',
  [InsightCategory.RankedCountGlobal]: 'Ranked Count',
  [InsightCategory.RankChange]: 'Rank Change',
  [InsightCategory.ScoreMilestone]: 'Score Milestone',
  [InsightCategory.TierMilestone]: 'Tier Milestone',
  [InsightCategory.UnbalancedProfile]: 'Rank Imbalance',
};

const InsightsCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [insights, setInsights] = useState<InsightsQuery['insights']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { insights: insightsData } = await fetchInsights();

      if (insightsData?.length) {
        setInsights(insightsData);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }

    const scrollSnapList = api.scrollSnapList();
    setCount(scrollSnapList?.length ?? 0);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (loading) {
    return (
      <div className="flex w-full h-[132px] flex-col gap-3 mt-3">
        <Skeleton className="w-full h-[16px]" />
        <Skeleton className="w-full h-[16px]" />
        <Skeleton className="w-full h-[16px]" />
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
        <div className="hidden md:block absolute inset-0 rotate-[-6deg] scale-y-[1.6] -translate-x-10 pointer-events-none bg-landing-page-gradient-start-color rounded-[100%]" />
        <CarouselContent>
          {insights?.map((insight, index) => (
            <CarouselItem key={index} className="flex items-center">
              <Card className="bg-transparent border-0 shadow-none py-0">
                <CardContent className="flex flex-col justify-center px-0">
                  <span>
                    <span className="font-semibold">{InsightCategoryTitle[insight.category]}:</span>{' '}
                    <InsightText insight={insight} />
                  </span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </div>

      <div className="flex items-center justify-between relative z-1">
        <div className="flex items-center gap-2">
          <CarouselPrevious className="static translate-none" />
          <CarouselNext className="static translate-none" />
        </div>
        <div className="text-sm text-muted-foreground">
          {current} / {count}
        </div>
      </div>
    </Carousel>
  );
};

export default memo(InsightsCarousel);
