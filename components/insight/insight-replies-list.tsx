import { InsightContainer } from './insight-container';
import { InsightHeader } from './insight-header';
import InsightText from './insight-text';
import type { InsightQuery, InsightsQuery } from '@/types/generated/graphql';

type ListedInsightReply = InsightsQuery['insights'][number]['replies'][number];
type DetailInsightReply = NonNullable<InsightQuery['insight']>['replies'][number];

type InsightRepliesListProps = {
  replies: ListedInsightReply[] | DetailInsightReply[];
};

export const InsightRepliesList = ({ replies }: InsightRepliesListProps) => {
  if (!replies?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 ml-6">
      {replies.map((reply, index) => (
        <InsightContainer key={index}>
          <InsightHeader createdAt={new Date(reply.createdAt)} socialPosts={reply.socialPosts} />
          <InsightText insight={reply} />
        </InsightContainer>
      ))}
    </div>
  );
};
