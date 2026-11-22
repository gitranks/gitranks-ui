import type { IconType } from 'react-icons';
import { SiApachemaven, SiDart, SiGo, SiNpm, SiPackagist, SiPypi, SiRust } from 'react-icons/si';

import type { RegistryId } from '@/lib/packages/registries';

/**
 * Each registry's mark. Beside the registry table rather than in it: the table is read by the routing proxy too, which
 * has no use for an icon set.
 */
export const REGISTRY_ICONS = {
  npm: SiNpm,
  pypi: SiPypi,
  go: SiGo,
  crates: SiRust,
  pub: SiDart,
  packagist: SiPackagist,
  maven: SiApachemaven,
} as const satisfies Record<RegistryId, IconType>;
