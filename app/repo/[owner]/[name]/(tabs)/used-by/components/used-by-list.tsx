'use client';

import { type FC, type ReactNode, useRef, useState } from 'react';

import { PackageFilter, type PackageFilterOption } from './package-filter';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import {
  registryOfRepoPackage,
  repoPackageKeyOf,
  repoPackageRefOf,
  spansRegistries,
} from '@/app/repo/[owner]/[name]/utils/repo-package-registry';
import { DEPENDENTS_MAX_OFFSET, DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import { DependentsTable } from '@/components/dependents/dependents-table';
import { HideArchivedToggle } from '@/components/dependents/hide-archived-toggle';
import { ShowMore } from '@/components/dependents/show-more';
import { FollowSlot, type FollowSlotProps } from '@/components/package-follow/follow-slot';
import type { RepoPackage, RepoUsedBy, RepoUsedByItem } from '@/graphql/repo-packages';
import { REGISTRIES, spelledNameOf } from '@/lib/packages/registries';

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

type ListedPackage = Pick<RepoPackage, 'name' | 'displayName' | 'registry'>;

/**
 * What one press of Follow covers: the package the list is cut to (by its `<registry>/<name>`), else the tab's own
 * choice.
 */
export function followOf(
  nameWithOwner: string,
  packages: readonly ListedPackage[],
  total: number,
  filter: string | null,
): Pick<FollowSlotProps, 'packages' | 'label'> {
  const one = (pkg: ListedPackage) => ({ packages: [repoPackageRefOf(pkg)], label: spelledNameOf(pkg) });
  const cut = filter === null ? undefined : packages.find((pkg) => repoPackageKeyOf(pkg) === filter);
  if (cut) return one(cut);
  // Four or more: all of them at once; fewer: the most used.
  if (total >= 4) {
    return { packages: packages.map(repoPackageRefOf), label: `${nameWithOwner} packages` };
  }
  return one(packages[0]);
}

/**
 * The filter's options, one per package by its `<registry>/<name>`: its name, and its registry when the packages are
 * on more than one.
 */
export const filterOptionsOf = (packages: readonly ListedPackage[]): PackageFilterOption[] => {
  const named = spansRegistries(packages);
  return packages.map((pkg) => ({
    value: repoPackageKeyOf(pkg),
    name: spelledNameOf(pkg),
    ...(named ? { registryLabel: REGISTRIES[registryOfRepoPackage(pkg)].label } : {}),
  }));
};

/**
 * The rows with the packages each one uses as the registry writes them. The rows name packages by name alone, so a
 * name two of the repository's packages share is left as it is, and so is a package past the ones the tab lists.
 */
export function withSpelledUses<Row extends Pick<RepoUsedByItem, 'uses'>>(
  rows: readonly Row[],
  packages: readonly ListedPackage[],
): Row[] {
  const spelled = new Map<string, string | null>();
  for (const pkg of packages) {
    spelled.set(pkg.name, spelled.has(pkg.name) ? null : spelledNameOf(pkg));
  }
  return rows.map((row) => ({ ...row, uses: row.uses.map((name) => spelled.get(name) ?? name) }));
}

type UsedByListProps = {
  nameWithOwner: string;
  packages: ListedPackage[];
  /** How many packages it publishes. */
  total: number;
  /** The first page, unfiltered, as the page drew it. */
  initial: RepoUsedBy;
  /** The Questions block, between the list and Follow. */
  children?: ReactNode;
};

type Shown = RepoUsedBy & {
  pkg: string | null;
  hideArchived: boolean;
  /** Where the next read starts: one page size past the last read, whatever it held. */
  nextOffset: number;
  /** Whether a further read can hold rows. */
  more: boolean;
};

/**
 * The list after a read at `offset`. A page can hold fewer rows than its size (rows of removed accounts are left out
 * but still counted), so the next read starts a page size on, not at the rows shown; a short page is the last one, and
 * a row already shown is not added again.
 */
export function shownAfter(
  before: Shown | null,
  page: RepoUsedBy,
  offset: number,
  pkg: string | null,
  hideArchived: boolean,
): Shown {
  const kept = offset > 0 && before ? before.items : [];
  const seen = new Set(kept.map(({ nameWithOwner }) => nameWithOwner));
  const nextOffset = offset + DEPENDENTS_PAGE_SIZE;
  return {
    ...page,
    items: [...kept, ...page.items.filter(({ nameWithOwner }) => !seen.has(nameWithOwner))],
    pkg,
    hideArchived,
    nextOffset,
    more: page.items.length >= DEPENDENTS_PAGE_SIZE && nextOffset < page.total && nextOffset <= DEPENDENTS_MAX_OFFSET,
  };
}

/**
 * A repository's dependents, a page at a time: the package filter (chips for two or three packages, a menu for more), the
 * "Hide archived" toggle when the list has an archived row, the table, "Show more", and the Follow slot at the end.
 * The filter and the toggle are this page's state, not its URL: the cached page is one, and every change reads the rows
 * from the route handler.
 */
export const UsedByList: FC<UsedByListProps> = ({ nameWithOwner, packages, total, initial, children }) => {
  const [shown, setShown] = useState<Shown>(() => shownAfter(null, initial, 0, null, false));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest read is shown: a slower earlier one is dropped.
  const latest = useRef(0);

  // `pkg` is the package's `<registry>/<name>`; the rows are asked for by its name.
  const read = async (offset: number, pkg: string | null, hideArchived: boolean) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    const name = pkg === null ? null : (packages.find((item) => repoPackageKeyOf(item) === pkg)?.name ?? null);
    try {
      const response = await fetch(`${usedByRoutePath(nameWithOwner)}${usedByRouteQuery(offset, name, hideArchived)}`);
      const body = response.ok ? ((await response.json()) as { page?: RepoUsedBy | null }) : null;
      if (id !== latest.current) return;
      if (!body?.page) {
        setError('Could not load the repositories. Try again in a few minutes.');
        return;
      }
      const page = body.page;
      setShown((before) => shownAfter(before, page, offset, pkg, hideArchived));
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
      {/* The rows change in place: busy while a read runs, and the count below is said when it changes. */}
      <div aria-busy={loading}>
        <ProfileCard className="gap-0 p-0">
          {(several || showToggle) && (
            <div className="flex flex-wrap items-center gap-2 p-4">
              {several && (
                <PackageFilter
                  options={filterOptionsOf(packages)}
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
          <DependentsTable rows={several ? withSpelledUses(shown.items, packages) : shown.items} showUses={several} />
          <ShowMore
            shown={shown.items.length}
            total={shown.total}
            more={shown.more}
            loading={loading}
            error={error}
            onMore={() => read(shown.nextOffset, shown.pkg, shown.hideArchived)}
          />
        </ProfileCard>
      </div>
      {children}
      <FollowSlot packages={follow.packages} label={follow.label} placement="used-by" />
    </>
  );
};
