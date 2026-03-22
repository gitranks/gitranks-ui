import { format } from 'date-fns';

import InsightText from './insight-text';
import { Link } from '@/components/link/link';
import { Card, CardContent } from '@/components/ui/card';
import type { InsightQuery, InsightsQuery } from '@/types/generated/graphql';

type ListedInsightPost = InsightsQuery['insights'][number];
type DetailInsightPost = NonNullable<InsightQuery['insight']>;

type InsightPostCardProps = {
  insight: ListedInsightPost | DetailInsightPost;
  showRepliesLink?: boolean;
};

export const InsightPostCard = ({ insight, showRepliesLink = true }: InsightPostCardProps) => {
  return (
    <Card>
      <CardContent>
        <InsightText insight={insight} />
        {showRepliesLink && (
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
        )}
      </CardContent>
    </Card>
  );
};
