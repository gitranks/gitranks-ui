import type { FC } from 'react';

import { DEPENDENT_MIN_STARS } from '../package-rankings';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';
import { registryLabelList, registryManifestList } from '@/lib/packages/registries';
import { PACKAGE_METHODOLOGY_PATH } from '@/utils/package-paths';

/** "npm packages only": the registries the rankings list. */
const LISTED = `${registryLabelList()} packages only`;

/** "+ stars that list the package in their own package.json…", with each listed registry's file. */
const COUNTED = `+ stars that list the package in their own ${registryManifestList()}. Lockfiles, forks and example, docs or test folders don't count. Read once a month.`;

/** What package rankings count for now, on every package ranking page: the registries listed, direct dependents. */
export const PackageBetaNotice: FC = () => (
  <div className="flex items-start gap-3 rounded-xl border bg-muted p-4">
    <Pill tone="violet" size="small">
      Beta
    </Pill>
    <p className="text-sm">
      Package rankings are new. For now we rank <b>{LISTED}</b>, and count <b>direct dependents only</b>: repositories
      with {DEPENDENT_MIN_STARS}
      {COUNTED}{' '}
      <Link href={PACKAGE_METHODOLOGY_PATH} className="text-inherit hover:text-foreground">
        How we count
      </Link>
    </p>
  </div>
);
