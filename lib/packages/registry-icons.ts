import type { IconType } from 'react-icons';
import { SiNpm, SiPypi } from 'react-icons/si';

import type { RegistryId } from '@/lib/packages/registries';

/**
 * Each registry's mark. Beside the registry table rather than in it: the table is read by the routing proxy too, which
 * has no use for an icon set.
 */
export const REGISTRY_ICONS = {
  npm: SiNpm,
  pypi: SiPypi,
} as const satisfies Record<RegistryId, IconType>;
