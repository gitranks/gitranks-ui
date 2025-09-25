import { memo } from 'react';

import { Link } from '@/components/link/link';
import { type InsightsQuery, SegmentType } from '@/types/generated/graphql';

type InsightTextProps = {
  insight: NonNullable<InsightsQuery['insights']>[number];
};

const InsightText: React.FC<InsightTextProps> = ({ insight }) => {
  const { segments, entities } = insight;

  return segments.map((segment) => {
    if (!segment) return null;

    if (segment.type === SegmentType.Mention) {
      const githubHandle = entities?.mentions[segment.entityKey!]?.handles?.github;
      return (
        <Link
          key={`${segment.type}-${segment.entityKey}`}
          href={`/profile/${githubHandle}`}
          className="text-foreground hover:text-foreground/80"
        >
          {segment.text}
        </Link>
      );
    }

    if (segment.type === SegmentType.Link) {
      const link = entities?.links[segment.entityKey!]?.url;
      return (
        <Link
          key={`${segment.type}-${segment.entityKey}`}
          href={link}
          className="text-foreground hover:text-foreground/80"
        >
          {segment.text}
        </Link>
      );
    }

    if (segment.type === SegmentType.Text) {
      return segment.text;
    }

    return null;
  });
};

export default memo(InsightText);
