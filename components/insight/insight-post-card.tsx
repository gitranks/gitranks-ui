import { InsightContainer } from './insight-container';
import { InsightHeader } from './insight-header';
import InsightText from './insight-text';
import { Link as CustomLink } from '@/components/link/link';
import type { InsightQuery, InsightsQuery } from '@/types/generated/graphql';

type ListedInsightPost = InsightsQuery['insights'][number];
type DetailInsightPost = NonNullable<InsightQuery['insight']>;

type InsightPostCardProps = {
  insight: ListedInsightPost | DetailInsightPost;
  showRepliesLink?: boolean;
};

export const InsightPostCard = ({ insight, showRepliesLink = true }: InsightPostCardProps) => {
  return (
    <InsightContainer>
      <InsightHeader createdAt={new Date(insight.createdAt)} socialPosts={insight.socialPosts} />
      <InsightText insight={insight} />
      {showRepliesLink && (
        <div className="flex justify-between items-center gap-2 text-sm text-muted-foreground">
          {insight.replies.length > 0 ? (
            <CustomLink href={`/insights/${insight.id}`} className="text-sm text-muted-foreground">
              Details
            </CustomLink>
          ) : (
            <div />
          )}
        </div>
      )}
    </InsightContainer>
  );
};
