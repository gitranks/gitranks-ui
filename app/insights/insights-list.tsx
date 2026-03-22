'use client';

import { useState } from 'react';

import { InsightPostCard } from '../components/insight-post-card';
import { Button } from '@/components/ui/button';
import { fetchInsights } from '@/graphql/helpers/fetch-insights';
import type { InsightsQuery } from '@/types/generated/graphql';

const PAGE_SIZE = 20;

type InsightsListProps = {
  initialInsights: InsightsQuery['insights'];
};

export const InsightsList = ({ initialInsights }: InsightsListProps) => {
  const [insights, setInsights] = useState(initialInsights);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialInsights.length === PAGE_SIZE);

  const handleShowMore = async () => {
    setLoading(true);

    const { insights: nextInsights = [] } = await fetchInsights({ skip: insights.length, limit: PAGE_SIZE });

    setInsights((current) => [...current, ...nextInsights]);
    setHasMore(nextInsights.length === PAGE_SIZE);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {insights.map((insight) => (
        <InsightPostCard key={insight.id} insight={insight} />
      ))}

      {hasMore && (
        <Button type="button" variant="outline" onClick={handleShowMore} disabled={loading}>
          {loading ? 'Loading...' : 'Show more'}
        </Button>
      )}
    </div>
  );
};
