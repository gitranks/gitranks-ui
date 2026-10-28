import type { FC } from 'react';

import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { MoreLink, ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import type { EntityFacts } from '@/badge/v3/facts';
import { promotedBadges } from '@/badge/v3/promotion';
import { badgeTiles, entityNameOf } from '@/badge/v3/tiles';
import { BadgeTiles } from '@/components/badge-tiles/badge-tiles';

const INTRO: Record<EntityFacts['kind'], (name: string) => string> = {
  user: (name) => `Show ${name}'s ranks in a README or on a site. Click a badge for its code.`,
  repo: (name) => `Show ${name}'s ranks in its README. Click a badge for its code.`,
  org: (name) => `Show ${name}'s ranks in a README or on its site. Click a badge for its code.`,
};

type BadgesCardProps = {
  /** The entity's badge data; nothing shows without it. */
  entity: EntityFacts | null;
  now?: Date;
};

/**
 * The badges a page promotes for its entity's size, live, each opening its code in the builder. Nothing shows when
 * none of them is available.
 */
export const BadgesCard: FC<BadgesCardProps> = ({ entity, now = new Date() }) => {
  if (!entity) {
    return null;
  }

  const tiles = badgeTiles(entity, promotedBadges(entity, now), now);
  if (!tiles.length) {
    return null;
  }

  const name = entityNameOf(entity);

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1">
          <ProfileCardHeader>
            <h2>Badges</h2>
          </ProfileCardHeader>
          <p className="text-sm text-muted-foreground">{INTRO[entity.kind](name)}</p>
        </div>
        {/* Every badge this entity has: the builder's step 2, with the entity already found. */}
        <MoreLink href={builderHref({ kind: entity.kind, name })} rel="nofollow" className="shrink-0">
          See all badges
        </MoreLink>
      </div>
      <BadgeTiles tiles={tiles} />
    </ProfileCard>
  );
};
