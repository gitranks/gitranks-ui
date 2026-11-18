import type { FC } from 'react';

import { DEPENDENT_MIN_STARS } from '../package-rankings';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';

/** Where package numbers are explained. */
export const PACKAGE_METHODOLOGY_PATH = '/methodology/packages';

/** What package rankings count for now, on every package ranking page. */
export const PackageBetaNotice: FC = () => (
  <div className="flex items-start gap-3 rounded-xl border bg-muted p-4">
    <Pill tone="violet" size="small">
      Beta
    </Pill>
    <p className="text-sm">
      Package rankings are new. For now we rank <b>npm packages only</b>, and count <b>direct dependents only</b>:
      repositories with {DEPENDENT_MIN_STARS}+ stars that list the package in their own package.json. Lockfiles, forks
      and example, docs or test folders don&apos;t count. Read once a month.{' '}
      <Link href={PACKAGE_METHODOLOGY_PATH} className="text-inherit hover:text-foreground">
        How we count
      </Link>
    </p>
  </div>
);
