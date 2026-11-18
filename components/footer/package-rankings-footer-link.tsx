'use client';

import { Link } from '../link/link';
import { usePackagesOpen } from '@/lib/packages/packages-open';
import { packageRankingPath } from '@/utils/package-paths';

/**
 * "Package Rankings" in the footer's site links, only for a viewer package pages are open to: asked in the browser
 * once the page is up, as the header's item is, since pages are cached for everyone. Once package pages are open to
 * everyone for good, it becomes a plain entry of the footer's list, in every page's HTML.
 */
export function PackageRankingsFooterLink({ className }: { className: string }) {
  const open = usePackagesOpen();

  return open ? (
    <li>
      <Link href={packageRankingPath('downloads')} className={className}>
        Package Rankings
      </Link>
    </li>
  ) : null;
}
