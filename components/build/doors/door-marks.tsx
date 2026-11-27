import type { ReactNode } from 'react';

/*
 * The small marks that say what a row of "Go further" is: a book for lessons, a box for a project, a ring with a dot
 * for a real issue, and a briefcase for jobs. Stroke icons in the colour of the text around them.
 */

export type DoorMark = 'lessons' | 'project' | 'issue' | 'job';

const PATHS: Record<DoorMark, ReactNode> = {
  lessons: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>
  ),
  project: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
    </>
  ),
  issue: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  job: (
    <>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </>
  ),
};

/** A mark in its small tile, as a row of Settings has one. */
export function DoorMarkTile({ mark }: { mark: DoorMark }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      data-door-mark={mark}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden="true"
      >
        {PATHS[mark]}
      </svg>
    </span>
  );
}
