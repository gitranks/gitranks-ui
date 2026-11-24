'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';

import {
  FixRow,
  IssuesBack,
  IssuesBox,
  IssuesEmail,
  IssuesEndBox,
  IssuesFilters,
  IssuesFoot,
} from '@/components/learn/issues/issues-parts';
import { Button } from '@/components/ui/button';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import {
  FIXES_EMPTY,
  ISSUES_FAILED,
  ISSUES_TITLE,
  ISSUES_UNAVAILABLE,
  type IssuesAt,
  type IssuesList,
  type IssuesNames,
  type IssuesRow,
  type IssuesView,
  issuesBackOf,
  issuesChipsOf,
  issuesEmailStateOf,
  issuesEndOf,
  issuesHrefOf,
  issuesMarkdownPathOf,
  issuesSwitchesOf,
  type LearnFixes,
  rowLessonOf,
  unchippedOf,
  VISITOR_NOTE,
  visitorEndOf,
} from '@/lib/learn/issues';
import { readMoreLearnFixes } from '@/lib/learn/issues.actions';
import { LEARN_COURSES_PATH } from '@/lib/learn/paths';
import { LEARN_MASKED_LINE, type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';
import type { MaskedIssue } from '@/lib/workspace/masked-issue.types';

/**
 * What the list shows:
 * - `visitor`: the five for the view, the same for everyone; `pending` while a signed-in person's own are read;
 * - `personal`: the signed-in person's five, with the switches, the counts, the empty end and the email;
 * - `fixed`: the view's merged fixes ("Fixed" set), ten at a time, the same for everyone;
 * - `unavailable`: the API answers no list, or does not know it yet;
 * - `failed`: the person's list did not load.
 */
export type IssuesLayer =
  | { kind: 'visitor'; rows: IssuesRow[]; pending?: boolean }
  | { kind: 'personal'; list: IssuesList; reads?: MaskedListReads; pending?: boolean }
  | { kind: 'fixed'; fixes: LearnFixes }
  | { kind: 'unavailable' }
  | { kind: 'failed' };

/** The presses a signed-in person's list answers; each optional, so a board draws the list without them. */
export type IssuesHandlers = {
  /** A skip answered: the next issue the API chose, for the list to read again around. */
  onSkipped?: (id: string, next: MaskedIssue) => void;
  /** A row left the list (taken by someone else, or no longer open). */
  onLeave?: (id: string) => void;
  onRetry?: () => void;
  email?: { pending?: boolean; error?: string | null; onTurnOn?: () => void; onTurnOff?: () => void };
};

export type IssuesScreenProps = {
  view: IssuesView;
  at?: IssuesAt;
  names?: IssuesNames;
  layer: IssuesLayer;
} & IssuesHandlers;

const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

/**
 * Issues (page 8) from plain data: one list with no visible title. Above it the way back to the lesson or the course
 * that opened it, the chips with their crosses and, for a signed-in person, the switches with their counts; then the
 * line on how the list works, the masked rows with their lesson lines and the foot under them. An empty list says why,
 * with the one press that would show something; "Fixed" shows the merged fixes instead.
 */
export function IssuesScreen({ view, at = 'issues', names = {}, layer, ...handlers }: IssuesScreenProps) {
  const chips = issuesChipsOf(view, names, at);
  const back = issuesBackOf(view, names);
  const switches = layer.kind === 'personal' && !view.fixed ? issuesSwitchesOf(view, layer.list, at) : [];
  const clearHref = chips.length ? issuesHrefOf(unchippedOf(view), 'issues') : null;
  return (
    <main className={MAIN} data-issues={layer.kind} aria-busy={('pending' in layer && layer.pending) || undefined}>
      <h1 className="sr-only">{ISSUES_TITLE}</h1>
      {back ? <IssuesBack back={back} /> : null}
      <IssuesFilters chips={chips} switches={switches} clearHref={clearHref} />
      <IssuesBody view={view} at={at} layer={layer} handlers={handlers} />
      <IssuesFoot markdownHref={issuesMarkdownPathOf(view, at)} />
    </main>
  );
}

function IssuesBody({
  view,
  at,
  layer,
  handlers,
}: {
  view: IssuesView;
  at: IssuesAt;
  layer: IssuesLayer;
  handlers: IssuesHandlers;
}) {
  if (layer.kind === 'unavailable') {
    return (
      <IssuesBox kind="unavailable" title={ISSUES_UNAVAILABLE.title} text={ISSUES_UNAVAILABLE.text}>
        <Button asChild variant="outline" className="max-sm:min-h-11">
          <Link href={LEARN_COURSES_PATH} prefetch={false}>
            See the courses
          </Link>
        </Button>
      </IssuesBox>
    );
  }
  if (layer.kind === 'failed') {
    return (
      <IssuesBox kind="failed" title="Not loaded" text={ISSUES_FAILED}>
        {handlers.onRetry ? (
          <Button type="button" variant="outline" className="max-sm:min-h-11" onClick={handlers.onRetry}>
            Try again
          </Button>
        ) : null}
      </IssuesBox>
    );
  }
  // A new view's fixes start again from their first ten.
  if (layer.kind === 'fixed') return <FixesList key={issuesHrefOf(view, at)} view={view} fixes={layer.fixes} />;
  if (layer.kind === 'visitor') {
    if (!layer.rows.length) {
      const end = visitorEndOf(view);
      return <IssuesBox kind="visitor-end" title={end.title} text={end.text} />;
    }
    return (
      <>
        <IssueRows rows={layer.rows} visitor handlers={handlers} reads={NO_MASKED_READS} />
        {layer.pending ? null : <VisitorNote href={issuesHrefOf(view, at)} />}
      </>
    );
  }
  const end = issuesEndOf(view, layer.list, at);
  if (end) {
    return (
      <IssuesEndBox
        end={end}
        email={
          <IssuesEmail
            state={issuesEmailStateOf(layer.list)}
            pending={handlers.email?.pending}
            error={handlers.email?.error}
            onTurnOn={handlers.email?.onTurnOn}
            onTurnOff={handlers.email?.onTurnOff}
          />
        }
      />
    );
  }
  return <IssueRows rows={layer.list.rows} handlers={handlers} reads={layer.reads ?? NO_MASKED_READS} />;
}

/** The line on how the list works, the masked rows with their lesson lines, and the foot under them. */
function IssueRows({
  rows,
  visitor = false,
  handlers,
  reads,
}: {
  rows: readonly IssuesRow[];
  visitor?: boolean;
  handlers: IssuesHandlers;
  reads: MaskedListReads;
}) {
  return (
    <>
      <p className="m-0 max-w-prose text-sm text-muted-foreground" data-learn-masked-line="">
        {LEARN_MASKED_LINE}
      </p>
      <MaskedList from="learn" pageFrom="learn" visitor={visitor} reads={reads} className="gap-4">
        <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
          {rows.map((row) => (
            <li key={row.issue.id} data-learn-only={row.learnOnly ? '' : undefined}>
              <MaskedListRow
                issue={row.issue}
                full={visitor ? null : row.full}
                lesson={rowLessonOf(row, visitor)}
                onReplace={handlers.onSkipped ? (next) => handlers.onSkipped?.(row.issue.id, next) : undefined}
                onLeave={handlers.onLeave ? () => handlers.onLeave?.(row.issue.id) : undefined}
              />
            </li>
          ))}
        </ul>
      </MaskedList>
    </>
  );
}

/** Under a visitor's five: signing in shows the issues that fit them. */
function VisitorNote({ href }: { href: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-issues-visitor-note="">
      <p className="m-0 text-sm text-muted-foreground">{VISITOR_NOTE}</p>
      <Button
        type="button"
        variant="outline"
        className="max-sm:min-h-11"
        onClick={() => {
          signIn(IDENTITY_PROVIDER, { redirectTo: href }).catch(() => {});
        }}
      >
        Sign in with GitHub
      </Button>
    </div>
  );
}

/** The view's merged fixes, newest first: ten, then "Show 10 more" in place. Or why there are none. */
export function FixesList({ view, fixes }: { view: IssuesView; fixes: LearnFixes }) {
  const [rows, setRows] = useState(fixes.rows);
  const [next, setNext] = useState(fixes.next);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!rows.length) return <IssuesBox kind="fixes-end" title={FIXES_EMPTY.title} text={FIXES_EMPTY.text} />;
  const total = Math.max(fixes.total, rows.length);

  const more = () =>
    startTransition(async () => {
      if (!next) return;
      setFailed(false);
      const read = await readMoreLearnFixes(
        { lesson: view.lesson ?? undefined, course: view.course ?? undefined, language: view.language ?? undefined },
        next,
      ).catch(() => null);
      if (!read) {
        setFailed(true);
        return;
      }
      const shown = new Set(rows.map((row) => `${row.repo}#${row.number}`));
      setRows([...rows, ...read.rows.filter((row) => !shown.has(`${row.repo}#${row.number}`))]);
      setNext(read.next);
    });

  return (
    <div className="flex flex-col gap-4" data-fixes="">
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {rows.map((fix) => (
          <li key={`${fix.repo}#${fix.number}`}>
            <FixRow fix={fix} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground" data-fixes-count="">
        <span aria-live="polite">
          {next ? `Showing ${rows.length} of ${total} ` : `${rows.length} `}
          {total === 1 ? 'fix' : 'fixes'}
        </span>
        {next ? (
          <Button
            type="button"
            variant="outline"
            onClick={more}
            disabled={pending}
            className="min-h-10 px-4 font-semibold"
          >
            {pending ? 'Loading…' : `Show ${Math.min(10, Math.max(total - rows.length, 1))} more`}
          </Button>
        ) : null}
      </div>
      {failed ? (
        <p role="alert" className="m-0 text-sm text-destructive">
          Couldn’t load more. Try again in a minute.
        </p>
      ) : null}
    </div>
  );
}
