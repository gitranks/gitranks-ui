import { type FC, Suspense } from 'react';

import { loadBadgePackageCard } from '@/badge/v3/load';
import { BadgesCard } from '@/components/badges-card/badges-card';

export type PackageBadgeSectionProps = {
  /** The package's name: `x` or `@scope/x`. */
  name: string;
};

/** The package's badge data, read as its images read it, and its Badges card; nothing while it cannot be read. */
export const PackageBadges: FC<PackageBadgeSectionProps> = async ({ name }) => (
  <BadgesCard entity={await loadBadgePackageCard(name)} />
);

/**
 * The package's badges on its page: three promoted shields, the first one's code and the way to every package badge.
 * Its data is read on its own (kept under the package's tag); the page's cached render holds it.
 */
export const PackageBadgeSection: FC<PackageBadgeSectionProps> = ({ name }) => (
  <Suspense fallback={null}>
    <PackageBadges name={name} />
  </Suspense>
);
