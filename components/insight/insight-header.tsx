import Link from 'next/link';
import type { ComponentType } from 'react';
import { FaBluesky, FaMastodon, FaXTwitter } from 'react-icons/fa6';

import { Button } from '../ui/button';
import { InsightCreatedAt } from './insight-created-at';

type InsightHeaderProps = {
  createdAt: Date;
  socialPosts: unknown;
};

const SocialIconMap: Record<string, ComponentType> = {
  x: FaXTwitter,
  bluesky: FaBluesky,
  mastodon: FaMastodon,
};

export const InsightHeader = ({ createdAt, socialPosts }: InsightHeaderProps) => {
  const socialPostsRecord = (socialPosts ?? {}) as Record<keyof typeof SocialIconMap, { url?: any }>;

  return (
    <div className="flex justify-between items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="font-semibold">@GitRanks</div>
        <InsightCreatedAt createdAt={createdAt} />
      </div>
      <div className="flex items-center">
        {Object.entries(socialPostsRecord).map(([platform, data]) => {
          if (!data?.url) {
            return null;
          }

          const Icon = SocialIconMap[platform];
          if (!Icon) {
            return null;
          }

          return (
            <Button variant="ghost" size="icon" asChild key={platform}>
              <Link href={data.url} target="_blank" rel="noopener noreferrer">
                <Icon />
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
