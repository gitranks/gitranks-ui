import { InsightPostCard } from './insight-post-card';
import { InsightRepliesList } from './insight-replies-list';
import type { InsightQuery } from '@/types/generated/graphql';

type InsightDetailContentProps = {
  insight: NonNullable<InsightQuery['insight']>;
};

export const InsightDetailContent = ({ insight }: InsightDetailContentProps) => {
  return (
    <div className="flex flex-col gap-3">
      <InsightPostCard insight={insight} showRepliesLink={false} />
      <InsightRepliesList replies={insight.replies} />
    </div>
  );
};
