import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { INTERVIEWS_COLUMN } from '../column';
import { CompanyLogo } from '../company-logo';
import { INTERVIEWS_MAIN_BUTTON } from '../main-button';
import type { MineMark, MineRowView, MineView } from '@/lib/interviews/mine';
import { INTERVIEWS_HOME_PATH } from '@/lib/interviews/paths';
import { cn } from '@/lib/utils';

/*
 * My interviews, as the approved designs draw it: one reading column, every plan of the person one row each. A row
 * has the same parts in the same places: the logo, the name, one line, a mark, the arrow. The whole row is the link
 * to the plan, with no button inside. On a phone the mark moves under the line.
 */

/** The page's column: Interviews' reading column. */
export const MINE_MAIN_CLASS = INTERVIEWS_COLUMN;

/** The page's one sentence on who sees it, in every state. */
export const MINE_PRIVATE_LINE = 'Your interview plans are not publicly visible.';

/** The page's title and the line under it. */
export function MineHead() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 text-3xl font-bold tracking-tight">My interviews</h1>
      <p className="m-0 text-sm text-muted-foreground">{MINE_PRIVATE_LINE}</p>
    </div>
  );
}

const MARK_CLASS: Record<MineMark, string> = {
  done: 'bg-brand-soft-foreground',
  current: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground)]',
  to_come: 'bg-muted shadow-[inset_0_0_0_1px_var(--border)]',
};

/** One mark a round. The line beside them says where the person stands in words, so screen readers skip them. */
function Marks({ marks }: { marks: MineMark[] }) {
  return (
    <span className="flex flex-wrap items-center gap-[5px]" aria-hidden="true" data-interviews-marks="">
      {marks.map((mark, index) => (
        <span key={index} data-mark={mark} className={cn('block h-3.5 w-7 rounded-[3px]', MARK_CLASS[mark])} />
      ))}
    </span>
  );
}

/** A finished plan's mark. The line says it in words. */
function DoneMark() {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-positive"
      aria-hidden="true"
      data-interviews-done=""
    >
      <Check className="size-4 shrink-0" />
      Done
    </span>
  );
}

/** The mark of a row: the rounds of a plan in progress, or "Done". Nothing for a plan with no round known. */
function RowMark({ row }: { row: MineRowView }) {
  if (!row.marks) return <DoneMark />;
  return row.marks.length ? <Marks marks={row.marks} /> : null;
}

/** The parts of a row's line, with a dot between them that a screen reader skips. */
function Line({ parts }: { parts: string[] }) {
  if (!parts.length) return null;
  return (
    <span className="text-sm text-muted-foreground">
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}

/** One plan: the whole row is the link to its page. */
function MineRow({ row }: { row: MineRowView }) {
  return (
    <li className="border-t first:border-t-0" data-interviews-mine-row={row.marks ? 'in_progress' : 'finished'}>
      <Link
        href={row.href}
        className="flex items-center gap-3 px-4 py-3 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <CompanyLogo company={row.company} size={28} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-pretty text-sm font-semibold">{row.title}</span>
          <Line parts={row.line} />
          <span className="mt-1 flex items-center sm:hidden">
            <RowMark row={row} />
          </span>
        </span>
        <span className="flex shrink-0 items-center max-sm:hidden">
          <RowMark row={row} />
        </span>
        <span className="text-muted-foreground">
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

/** One part of the page: its heading, an optional line, and its rows. */
function MinePart({ id, title, line, rows }: { id: string; title: string; line?: string; rows: MineRowView[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id} data-interviews-mine-part={id}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-xl font-bold tracking-tight">
          {title}
        </h2>
        {line ? <p className="m-0 text-sm text-muted-foreground">{line}</p> : null}
      </div>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0">
        {rows.map((row) => (
          <MineRow key={row.href} row={row} />
        ))}
      </ul>
    </section>
  );
}

/** The person's plans: in progress, then finished, each only when it has a plan; then the way to the companies. */
export function MineBody({ view }: { view: MineView }) {
  if (!view.inProgress.length && !view.finished.length) return <MineNone />;
  return (
    <>
      {view.inProgress.length ? (
        <MinePart
          id="interviews-mine-progress"
          title="In progress"
          line="The plan you worked on last comes first."
          rows={view.inProgress}
        />
      ) : null}
      {view.finished.length ? <MinePart id="interviews-mine-finished" title="Finished" rows={view.finished} /> : null}
      <p className="m-0 text-sm">
        <Link href={INTERVIEWS_HOME_PATH} className="font-medium text-link hover:underline">
          See all companies
        </Link>
      </p>
    </>
  );
}

/** No plan, for someone who opens the address anyway: one line and the way to the companies. */
export function MineNone() {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-5 py-6"
      data-interviews-mine="none"
    >
      <p className="m-0 text-base font-medium">You have no interview plan yet.</p>
      <Link href={INTERVIEWS_HOME_PATH} className={INTERVIEWS_MAIN_BUTTON}>
        See the companies
      </Link>
    </div>
  );
}

/** A state with no list: signed out, a session that ended, or a read that failed; with its one action. */
export function MineMessage({
  state,
  title,
  text,
  children,
}: {
  state: 'visitor' | 'ended' | 'failed';
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3" data-interviews-mine={state}>
      <h2 className="m-0 text-xl font-bold tracking-tight">{title}</h2>
      <p className="m-0 text-sm text-muted-foreground">{text}</p>
      <div>{children}</div>
    </div>
  );
}

/** The lists' place while the person's plans are on their way. */
export function MinePending() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" data-interviews-mine="pending">
      <span className="sr-only" role="status">
        Loading your interview plans…
      </span>
      <div className="h-7 w-40 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-32 rounded-lg border bg-card" />
    </div>
  );
}
