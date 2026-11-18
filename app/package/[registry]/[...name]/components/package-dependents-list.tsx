'use client';

import { type FC, useRef, useState } from 'react';

import { packageApiPath } from '../utils/package-params';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { DEPENDENTS_MAX_OFFSET, DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import { DependentsTable } from '@/components/dependents/dependents-table';
import { HideArchivedToggle } from '@/components/dependents/hide-archived-toggle';
import { ShowMore } from '@/components/dependents/show-more';
import type { PackageDependents } from '@/graphql/package-page';

/** The query of one read: its offset, archived rows left out. */
export function dependentsRouteQuery(offset: number, hideArchived: boolean): string {
  const query = new URLSearchParams();
  if (offset > 0) query.set('offset', String(offset));
  if (hideArchived) query.set('archived', '0');
  const search = query.toString();
  return search ? `?${search}` : '';
}

type Shown = PackageDependents & {
  hideArchived: boolean;
  /** Where the next read starts: one page size past the last read, whatever it held. */
  nextOffset: number;
  /** Whether a further read can hold rows. */
  more: boolean;
};

/**
 * The list after a read at `offset`. A page can hold fewer rows than its size (rows of removed accounts are left out
 * but still counted), so the next read starts a page size on; a short page is the last one, and a row already shown is
 * not added again.
 */
export function shownAfter(
  before: Shown | null,
  page: PackageDependents,
  offset: number,
  hideArchived: boolean,
): Shown {
  const kept = offset > 0 && before ? before.items : [];
  const seen = new Set(kept.map(({ nameWithOwner }) => nameWithOwner));
  const nextOffset = offset + DEPENDENTS_PAGE_SIZE;
  return {
    ...page,
    items: [...kept, ...page.items.filter(({ nameWithOwner }) => !seen.has(nameWithOwner))],
    hideArchived,
    nextOffset,
    more: page.items.length >= DEPENDENTS_PAGE_SIZE && nextOffset < page.total && nextOffset <= DEPENDENTS_MAX_OFFSET,
  };
}

const READ_FAILED = 'Could not load the repositories. Try again in a few minutes.';

/**
 * A package's dependents, a page at a time: "Hide archived" when it has an archived one, the table with where each
 * declares the package and at which version, and "Show more". The toggle is this page's state, not its URL: the
 * cached page is one, and every change reads the rows from the route handler.
 */
export const PackageDependentsList: FC<{ name: string; initial: PackageDependents }> = ({ name, initial }) => {
  const [shown, setShown] = useState<Shown>(() => shownAfter(null, initial, 0, false));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest read is shown: a slower earlier one is dropped.
  const latest = useRef(0);

  const read = async (offset: number, hideArchived: boolean) => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${packageApiPath(name, 'dependents')}${dependentsRouteQuery(offset, hideArchived)}`,
      );
      const body = response.ok ? ((await response.json()) as { page?: PackageDependents | null }) : null;
      if (id !== latest.current) return;
      if (!body?.page) {
        setError(READ_FAILED);
        return;
      }
      const page = body.page;
      setShown((before) => shownAfter(before, page, offset, hideArchived));
    } catch {
      if (id === latest.current) setError(READ_FAILED);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  };

  const showToggle = shown.archived > 0 || shown.hideArchived;

  return (
    // The rows change in place: busy while a read runs, and the count below is said when it changes.
    <div aria-busy={loading}>
      <ProfileCard className="gap-0 p-0">
        {showToggle && (
          <div className="flex flex-wrap items-center gap-2 p-4">
            <HideArchivedToggle
              className="ml-auto"
              checked={shown.hideArchived}
              disabled={loading}
              onChange={(hide) => read(0, hide)}
            />
          </div>
        )}
        <DependentsTable rows={shown.items} showDeclared />
        <ShowMore
          shown={shown.items.length}
          total={shown.total}
          more={shown.more}
          loading={loading}
          error={error}
          onMore={() => read(shown.nextOffset, shown.hideArchived)}
        />
      </ProfileCard>
    </div>
  );
};
