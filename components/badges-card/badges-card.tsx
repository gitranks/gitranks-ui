import type { FC } from 'react';

import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { markdownSnippet } from '@/app/badge/builder/[[...login]]/utils/snippets';
import { MoreLink, ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import { findBadge } from '@/badge/v3/catalogue';
import type { EntityFacts, PackageFacts } from '@/badge/v3/facts';
import { badgeImagePath } from '@/badge/v3/links';
import { type PromotedBadge, promotedBadges } from '@/badge/v3/promotion';
import { badgeTiles, entityLabelOf, entityNameOf, entityPathOf } from '@/badge/v3/tiles';
import { BadgeTiles } from '@/components/badge-tiles/badge-tiles';
import { REGISTRIES, REGISTRY_IDS } from '@/lib/packages/registries';
import { absoluteUrl } from '@/lib/seo/site';
import { packagePath } from '@/utils/package-paths';

const INTRO: Record<EntityFacts['kind'], (name: string) => string> = {
  user: (name) => `Show ${name}'s ranks in a README or on a site. Click a badge for its code.`,
  repo: (name) => `Show ${name}'s ranks in its README. Click a badge for its code.`,
  org: (name) => `Show ${name}'s ranks in a README or on its site. Click a badge for its code.`,
  package: (name) => `Show who builds on ${name} in its README.`,
};

/** The card's heading: a package's page offers one badge, with its code. */
const HEADING: Record<EntityFacts['kind'], string> = {
  user: 'Badges',
  repo: 'Badges',
  org: 'Badges',
  package: 'Badge',
};

const MORE: Record<EntityFacts['kind'], string> = {
  user: 'See all badges',
  repo: 'See all badges',
  org: 'See all badges',
  package: 'All package badges',
};

type BadgesCardProps = {
  /** The entity's badge data; nothing shows without it. */
  entity: EntityFacts | null;
  now: Date;
};

/** "Used by", "npm downloads": the badge's name, as the Markdown's alt text; a registry's name is kept as it writes it. */
const altOf = (title: string) =>
  REGISTRY_IDS.some((id) => title.startsWith(REGISTRIES[id].label))
    ? title
    : `${title.charAt(0).toUpperCase()}${title.slice(1)}`;

/** The Markdown of a package's first promoted badge, linked to its page: the code a README takes as it is. */
function packageMarkdown(pkg: PackageFacts, first: PromotedBadge): string | null {
  const badge = findBadge('package', first.id);
  if (!badge) return null;
  return markdownSnippet({
    imageUrl: absoluteUrl(badgeImagePath(entityPathOf(pkg), badge.id, 'svg', first.query)),
    pageUrl: absoluteUrl(packagePath(pkg.name)),
    alt: altOf(badge.title),
    auto: true,
  });
}

/**
 * The badges a page promotes for its entity's size, live, each opening its code in the builder. Nothing shows when
 * none of them is available. A package's page shows the first one's Markdown under them.
 */
export const BadgesCard: FC<BadgesCardProps> = ({ entity, now }) => {
  if (!entity) {
    return null;
  }

  const promoted = promotedBadges(entity, now);
  const tiles = badgeTiles(entity, promoted, now);
  if (!tiles.length) {
    return null;
  }

  const name = entityNameOf(entity);
  const markdown = entity.kind === 'package' ? packageMarkdown(entity, promoted[0]) : null;

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-1">
          <ProfileCardHeader>
            <h2>{HEADING[entity.kind]}</h2>
          </ProfileCardHeader>
          <p className="text-sm text-muted-foreground">{INTRO[entity.kind](entityLabelOf(entity))}</p>
        </div>
        {/* Every badge this entity has: the builder's step 2, with the entity already found. */}
        <MoreLink href={builderHref({ kind: entity.kind, name })} rel="nofollow" className="shrink-0">
          {MORE[entity.kind]}
        </MoreLink>
      </div>
      <BadgeTiles tiles={tiles} />
      {markdown && (
        <pre className="max-w-full overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">
          <code>{markdown}</code>
        </pre>
      )}
    </ProfileCard>
  );
};
