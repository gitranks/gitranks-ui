'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { InsightPostCard } from '@/components/insight/insight-post-card';
import { Button } from '@/components/ui/button';
import { fetchInsightsClient } from '@/graphql/helpers/fetch-insights-client';
import type { InsightsQuery } from '@/types/generated/graphql';

type InsightsLoadMoreProps = {
  /** Ids of the posts the server already rendered above, in order. */
  renderedIds: string[];
  pageSize: number;
  hasMore: boolean;
};

/** Posts past the server-rendered first page, fetched on demand. */
export const InsightsLoadMore = ({ renderedIds, pageSize, hasMore: initialHasMore }: InsightsLoadMoreProps) => {
  const [insights, setInsights] = useState<InsightsQuery['insights']>([]);
  // Rows requested so far, duplicates included, so the next request continues where the last ended.
  const [offset, setOffset] = useState(renderedIds.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const handleShowMore = async () => {
    setLoading(true);

    try {
      const { insights: nextInsights = [] } = await fetchInsightsClient({ skip: offset, limit: pageSize });
      // The first page can be a few minutes old: posts published since then shift the offsets,
      // so drop anything already on screen.
      const seen = new Set([...renderedIds, ...insights.map((insight) => insight.id)]);

      setInsights((current) => [...current, ...nextInsights.filter((insight) => !seen.has(insight.id))]);
      setOffset((current) => current + nextInsights.length);
      setHasMore(nextInsights.length === pageSize);
    } catch {
      toast.error('Could not load more posts. Please try again.');
    } finally {
      setLoading(false);
    }
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
