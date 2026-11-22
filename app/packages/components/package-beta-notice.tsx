import type { FC } from 'react';

import { DEPENDENT_MIN_STARS } from '../package-rankings';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';
import { type RegistryId, registryLabelList, registryManifestList } from '@/lib/packages/registries';
import { PACKAGE_METHODOLOGY_PATH } from '@/utils/package-paths';

/** "npm packages only": the registries the rankings list. */
const LISTED = `${registryLabelList()} packages only`;

/** "+ stars that list the package in their own package.json…", with the registries' files. */
const countedOf = (registries?: readonly RegistryId[]) =>
  `+ stars that list the package in their own ${registryManifestList(registries)}. Lockfiles, forks and example, docs or test folders don't count. Read once a month.`;

/**
 * What package rankings count for now, on every package ranking page: the registries listed, direct dependents, and
 * the files a dependent lists a package in, the page's registry's (every listed registry's without one).
 */
export const PackageBetaNotice: FC<{ registry?: RegistryId }> = ({ registry }) => (
  <div className="flex items-start gap-3 rounded-xl border bg-muted p-4">
    <Pill tone="violet" size="small">
      Beta
    </Pill>
    <p className="text-sm">
      Package rankings are new. For now we rank <b>{LISTED}</b>, and count <b>direct dependents only</b>: repositories
      with {DEPENDENT_MIN_STARS}
      {countedOf(registry ? [registry] : undefined)}{' '}
      <Link href={PACKAGE_METHODOLOGY_PATH} className="text-inherit hover:text-foreground">
        How we count
      </Link>
    </p>
  </div>
);
