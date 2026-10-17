'use client';

import { useState } from 'react';

import { InsightPostCard } from '@/components/insight/insight-post-card';
import { Button } from '@/components/ui/button';
import { fetchInsightsClient } from '@/graphql/helpers/fetch-insights-client';
import type { InsightsQuery } from '@/types/generated/graphql';

type InsightsLoadMoreProps = {
  /** How many posts the server already rendered above. */
  skip: number;
  pageSize: number;
  hasMore: boolean;
};

/** Posts past the server-rendered first page, fetched on demand. */
export const InsightsLoadMore = ({ skip, pageSize, hasMore: initialHasMore }: InsightsLoadMoreProps) => {
  const [insights, setInsights] = useState<InsightsQuery['insights']>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const handleShowMore = async () => {
    setLoading(true);

    const { insights: nextInsights = [] } = await fetchInsightsClient({
      skip: skip + insights.length,
      limit: pageSize,
    });

    setInsights((current) => [...current, ...nextInsights]);
    setHasMore(nextInsights.length === pageSize);
    setLoading(false);
  };

  return (
    <>
      {insights.map((insight) => (
        <InsightPostCard key={insight.id} insight={insight} />
      ))}

      {hasMore && (
        <Button type="button" variant="outline" onClick={handleShowMore} disabled={loading}>
          {loading ? 'Loading...' : 'Show more'}
        </Button>
      )}
    </>
  );
};
