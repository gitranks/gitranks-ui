import { type FC, Suspense } from 'react';

import { loadBadgePackageCard } from '@/badge/v3/load';
import { BadgesCard } from '@/components/badges-card/badges-card';
import type { RegistryId } from '@/lib/packages/registries';

export type PackageBadgeSectionProps = {
  /** The registry the package is on. */
  registry: RegistryId;
  /** The package's name: on npm `x` or `@scope/x`. */
  name: string;
};

/** The package's badge data, read as its images read it, and its Badges card; nothing while it cannot be read. */
export const PackageBadges: FC<PackageBadgeSectionProps> = async ({ registry, name }) => (
  <BadgesCard entity={await loadBadgePackageCard(registry, name)} />
);

/**
 * The package's badges on its page: three promoted shields, the first one's code and the way to every package badge.
 * Its data is read on its own (kept under the package's tag); the page's cached render holds it.
 */
export const PackageBadgeSection: FC<PackageBadgeSectionProps> = ({ registry, name }) => (
  <Suspense fallback={null}>
    <PackageBadges registry={registry} name={name} />
  </Suspense>
);
