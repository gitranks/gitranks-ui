import { InsightContainer } from './insight-container';
import { InsightHeader } from './insight-header';
import InsightText from './insight-text';
import { Link as CustomLink } from '@/components/link/link';
import type { InsightQuery, InsightsQuery } from '@/types/generated/graphql';

type ListedInsightPost = InsightsQuery['insights'][number];
type DetailInsightPost = NonNullable<InsightQuery['insight']>;

type InsightPostCardProps = {
  insight: ListedInsightPost | DetailInsightPost;
  showDetailsLink?: boolean;
};

export const InsightPostCard = ({ insight, showDetailsLink = true }: InsightPostCardProps) => {
  return (
    <InsightContainer>
      <InsightHeader createdAt={new Date(insight.createdAt)} socialPosts={insight.socialPosts} />
      <InsightText insight={insight} />
      {showDetailsLink && (
        <div className="flex justify-between items-center gap-2 text-sm text-muted-foreground">
          <CustomLink href={`/insights/${insight.id}`} className="text-sm text-muted-foreground">
            Details
          </CustomLink>
        </div>
      )}
    </InsightContainer>
  );
};
