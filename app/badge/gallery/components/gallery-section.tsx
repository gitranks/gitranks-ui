import type { FC } from 'react';

import { GALLERY_BADGES, type GALLERY_SECTIONS } from '../gallery-badges';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { MoreLink } from '@/app/profile/[login]/components/profile-card';
import type { EntityFacts } from '@/badge/v3/facts';
import { availableChoices, badgeTiles, entityNameOf } from '@/badge/v3/tiles';
import { BadgeTiles } from '@/components/badge-tiles/badge-tiles';
import { Link } from '@/components/link/link';
import { getRepoPath } from '@/utils/repo-paths';

const pageOf = (entity: EntityFacts) => {
  switch (entity.kind) {
    case 'repo':
      return getRepoPath(entity.nameWithOwner);
    case 'user':
      return `/profile/${encodeURIComponent(entity.login)}`;
    case 'org':
      return `/org/${encodeURIComponent(entity.login)}`;
  }
};

type GallerySectionProps = (typeof GALLERY_SECTIONS)[number] & { entity: EntityFacts | null; now: Date };

/** One kind's badges drawn for its #1; nothing when there is nothing to draw (the header's builder link stays). */
export const GallerySection: FC<GallerySectionProps> = ({ kind, title, make, leader, entity, now }) => {
  // A badge leads to the builder's first step, to make the same badge for the visitor's own entity.
  const tiles = entity ? badgeTiles(entity, availableChoices(entity, GALLERY_BADGES[kind], now), now, 'find') : [];
  if (!entity || !tiles.length) {
    return null;
  }
  const id = `gallery-${kind}`;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t pt-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            Drawn live for{' '}
            <Link href={pageOf(entity)} translate="no">
              {entityNameOf(entity)}
            </Link>
            , {leader} today. Click a badge to make it for yours.
          </p>
        </div>
        <MoreLink href={builderHref({ kind, name: '' })} rel="nofollow" className="shrink-0">
          {make}
        </MoreLink>
      </div>
      <BadgeTiles tiles={tiles} action="Make this badge" />
    </section>
  );
};
