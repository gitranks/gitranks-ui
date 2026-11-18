'use client';

import { GoPackage } from 'react-icons/go';

import { ListItem } from './menu-list-item';
import { usePackagesOpen } from '@/lib/packages/packages-open';
import { packageRankingPath } from '@/utils/package-paths';

/**
 * "Package Rankings" in the Rankings menu, only for a viewer package pages are open to: asked in the browser once the
 * page is up, as pages are cached for everyone, so it is in no page's HTML. Nothing until the answer comes, or closed.
 */
export function PackageRankingsMenuItem() {
  const open = usePackagesOpen();

  return open ? (
    <ListItem href={packageRankingPath('downloads')}>
      <GoPackage /> Package Rankings
    </ListItem>
  ) : null;
}
