'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { type DoorMark, DoorMarkTile } from './door-marks';
import { useBuildDoors } from './doors-live';
import { type FurtherRow, furtherProjectRowOf, issuesLineOf, JOB_ROW, nextCourseLineOf } from '@/lib/build/doors';
import type { BuildDoors } from '@/lib/build/types';

/** What "Go further" has from the course's page: the next course and the open issues, each when there is one. */
export type GoFurtherParts = {
  next: { name: string; href: Route; lessons: number } | null;
  issues: { open: number; href: Route } | null;
};

/** The rows drawn: three at the most, in the order learn, build, fix; the job row only in a place left free. */
export const MAX_FURTHER_ROWS = 3;

type Row = FurtherRow & { mark: DoorMark; external?: boolean };

/** The rows of "Go further" with Build's: the job row takes a place only when one of the three has nothing behind it. */
export function furtherRowsOf(parts: GoFurtherParts, project: FurtherRow | null): Row[] {
  const rows: Row[] = [];
  if (parts.next) {
    rows.push({
      mark: 'lessons',
      name: parts.next.name,
      line: nextCourseLineOf(parts.next.lessons),
      href: parts.next.href,
    });
  }
  if (project) rows.push({ mark: 'project', ...project });
  if (parts.issues) {
    rows.push({
      mark: 'issue',
      name: 'Fix a real issue',
      line: issuesLineOf(parts.issues.open),
      href: parts.issues.href,
    });
  }
  if (rows.length < MAX_FURTHER_ROWS) {
    rows.push({ mark: 'job', name: JOB_ROW.name, line: JOB_ROW.line, href: JOB_ROW.href as Route, external: true });
  }
  return rows;
}

const ROW = 'flex items-center gap-3 rounded-md -mx-2 px-2 py-1.5 hover:bg-accent';

function RowBody({ row }: { row: Row }) {
  return (
    <>
      <DoorMarkTile mark={row.mark} />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold text-link">
          {row.name}
          {row.external ? ' ↗' : null}
        </span>
        <span className="text-xs text-muted-foreground">{row.line}</span>
      </span>
    </>
  );
}

/**
 * The list inside "Go further" on a finished course. For a signed-in person, rows with a mark each: the next
 * course, Build's project (following the person: start it, go on with it, take its test) and real issues, with the job
 * row in a place left free, so the list is never empty. For a visitor, and until the doors are read, `today`: the list
 * as it is drawn without them. `drawn`: the doors as the catalogue draws them, read from nowhere.
 */
export function GoFurtherRows({
  course,
  parts,
  today,
  drawn,
}: {
  course: string;
  parts: GoFurtherParts;
  today: ReactNode;
  drawn?: BuildDoors;
}) {
  const read = useBuildDoors(drawn ? null : { course });
  const doors = drawn ?? read;
  if (!doors) return today;
  const rows = furtherRowsOf(parts, furtherProjectRowOf(doors));
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm" data-go-further="">
      {rows.map((row) => (
        <li key={row.mark} data-further-row={row.mark}>
          {row.external ? (
            <a href={row.href} rel="noreferrer" target="_blank" className={ROW}>
              <RowBody row={row} />
            </a>
          ) : (
            <Link href={row.href} prefetch={false} className={ROW}>
              <RowBody row={row} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
