'use client';

import { type FC, type ReactNode, useRef, useState } from 'react';

import { PackageFilter } from './package-filter';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { DependentsTable } from '@/components/dependents/dependents-table';
import { HideArchivedToggle } from '@/components/dependents/hide-archived-toggle';
import { ShowMore } from '@/components/dependents/show-more';
import { FollowSlot, type FollowSlotProps } from '@/components/package-follow/follow-slot';
import type { RepoPackage, RepoUsedBy } from '@/graphql/repo-packages';

/** Where the browser reads more rows of a repository's dependents. */
export const usedByRoutePath = (nameWithOwner: string) => {
  const [owner, name] = nameWithOwner.split('/');
  return `/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/used-by`;
};

/** The query of one read: its offset, the package it is cut to, archived rows left out. */
export function usedByRouteQuery(offset: number, pkg: string | null, hideArchived: boolean): string {
  const query = new URLSearchParams();
  if (offset > 0) query.set('offset', String(offset));
  if (pkg !== null) query.set('package', pkg);
  if (hideArchived) query.set('archived', '0');
  const search = query.toString();
  return search ? `?${search}` : '';
}

/** What one press of Follow covers: the package the list is cut to, else the tab's own choice. */
export function followOf(
  nameWithOwner: string,
  packages: readonly Pick<RepoPackage, 'name'>[],
  total: number,
  filter: string | null,
): Pick<FollowSlotProps, 'packages' | 'label'> {
  const one = (name: string) => ({ packages: [{ registry: 'npm' as const, name }], label: name });
  if (filter !== null) return one(filter);
  // Four or more: all of them at once; fewer: the most used.
  if (total >= 4) {
    return {
      packages: packages.map(({ name }) => ({ registry: 'npm' as const, name })),
      label: `${nameWithOwner} packages`,
    };
  }
  return one(packages[0].name);
}

type UsedByListProps = {
  nameWithOwner: string;
  packages: Pick<RepoPackage, 'name'>[];
  /** How many packages it publishes. */
  total: number;
  /** The first page, unfiltered, as the page drew it. */
  initial: RepoUsedBy;
  /** The Questions block, between the list and Follow. */
  children?: ReactNode;
};

type Shown = RepoUsedBy & { pkg: string | null; hideArchived: boolean };

/**
 * A repository's dependents, a page at a time: the package filter (chips for two or three packages, a menu for more), the
 * "Hide archived" toggle when the list has an archived row, the table, "Show more", and the Follow slot at the end.
 * The filter and the toggle are this page's state, not its URL: the cached page is one, and every change reads the rows
 * from the route handler.
 */
export const UsedByList: FC<UsedByListProps> = ({ nameWithOwner, packages, total, initial, children }) => {
  const [shown, setShown] = useState<Shown>({ ...initial, pkg: null, hideArchived: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest read is shown: a slower earlier one is dropped.
  const latest = useRef(0);

  const read = async (offset: number, pkg: string | null, hideArchived: boolean) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${usedByRoutePath(nameWithOwner)}${usedByRouteQuery(offset, pkg, hideArchived)}`);
      const body = response.ok ? ((await response.json()) as { page?: RepoUsedBy | null }) : null;
      if (id !== latest.current) return;
      if (!body?.page) {
        setError('Could not load the repositories. Try again in a few minutes.');
        return;
      }
      const page = body.page;
      setShown((before) =>
        offset > 0
          ? { ...page, items: [...before.items, ...page.items], pkg, hideArchived }
          : { ...page, pkg, hideArchived },
      );
    } catch {
      if (id === latest.current) setError('Could not load the repositories. Try again in a few minutes.');
    } finally {
      if (id === latest.current) setLoading(false);
    }
  };

  const several = total > 1;
  const follow = followOf(nameWithOwner, packages, total, shown.pkg);
  const showToggle = shown.archived > 0 || shown.hideArchived;

  return (
    <>
      <ProfileCard className="gap-0 p-0">
        {(several || showToggle) && (
          <div className="flex flex-wrap items-center gap-2 p-4">
            {several && (
              <PackageFilter
                names={packages.map(({ name }) => name)}
                total={total}
                value={shown.pkg}
                onChange={(pkg) => read(0, pkg, shown.hideArchived)}
                variant={total >= 4 ? 'dropdown' : 'chips'}
                disabled={loading}
              />
            )}
            {showToggle && (
              <HideArchivedToggle
                className="ml-auto"
                checked={shown.hideArchived}
                disabled={loading}
                onChange={(hide) => read(0, shown.pkg, hide)}
              />
            )}
          </div>
        )}
        <DependentsTable rows={shown.items} showUses={several} />
        <ShowMore
          shown={shown.items.length}
          total={shown.total}
          loading={loading}
          error={error}
          onMore={() => read(shown.items.length, shown.pkg, shown.hideArchived)}
        />
      </ProfileCard>
      {children}
      <FollowSlot packages={follow.packages} label={follow.label} placement="used-by" />
    </>
  );
};
