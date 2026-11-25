'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { IssuesBox, IssuesEndBox, IssuesFilters, IssuesFoot } from '@/components/learn/issues/issues-parts';
import type { IssuesHandlers, IssuesLayer } from '@/components/learn/issues/issues-screen';
import { LessonIssuesEmail } from '@/components/learn/issues/lesson-issues-email';
import {
  RealFixes,
  RealProjectsEnd,
  RealProjectsGroup,
  RealProjectsTop,
} from '@/components/learn/issues/real-projects';
import { Button } from '@/components/ui/button';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import {
  ISSUES_FAILED,
  ISSUES_UNAVAILABLE,
  type IssuesAt,
  type IssuesNames,
  type IssuesRow,
  type IssuesView,
  issuesChipsOf,
  issuesEndOf,
  issuesHrefOf,
  issuesMarkdownPathOf,
  issuesPublicInputOf,
  issuesSwitchesOf,
  issuesViewQueryOf,
  type LearnFixes,
  rowLessonOf,
} from '@/lib/learn/issues';
import { readMoreLearnFixes } from '@/lib/learn/issues.actions';
import { lessonIssuesEmailStateOf } from '@/lib/learn/lesson-issues-email';
import { coursePath, LEARN_COURSES_PATH, learnLessonPath } from '@/lib/learn/paths';
import { fixKeyOf, fixLanguageWordsOf, realProjectsEndsOf, realProjectsWordsOf } from '@/lib/learn/real-projects';
import { type MaskedListReads, NO_MASKED_READS } from '@/lib/workspace/masked-issue';

/*
 * A lesson in real projects, and a course's view with it: Issues at the lesson's or the course's own address.
 * The visible top, then two groups always in this order, "Open" and "Fixed", each with its end in its own place, so
 * the other never moves up. `open=1` shows the first group alone, `fixed=1` the second.
 */

/** The merged fixes as the page reads them: ten and the count, or the API answering none, or a failure. */
export type FixesLayer = Extract<IssuesLayer, { kind: 'fixed' | 'unavailable' | 'failed' }>;

export type RealProjectsScreenProps = {
  view: IssuesView;
  at: Exclude<IssuesAt, 'issues'>;
  names: IssuesNames;
  /** The open issues: the visitor's five, the person's five, or why not; null when the view shows the fixes alone. */
  open: Exclude<IssuesLayer, { kind: 'fixed' }> | null;
  /** The merged fixes; null when the view shows the open issues alone. */
  fixes: FixesLayer | null;
  /** How many open issues the shared list holds (the visitor's five): null when it could not be read. */
  shared: number | null;
  /** The pull requests whose walkthrough the reader passed; null for a visitor, while it loads and on a failure. */
  passed: ReadonlySet<string> | null;
  handlers: IssuesHandlers;
};

const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

export function RealProjectsScreen({
  view,
  at,
  names,
  open,
  fixes,
  shared,
  passed,
  handlers,
}: RealProjectsScreenProps) {
  const name = (at === 'lesson' ? names.lesson : names.course) ?? (at === 'lesson' ? view.lesson : view.course) ?? '';
  const backHref = at === 'lesson' ? learnLessonPath(view.lesson ?? '') : coursePath(view.course ?? '');
  const switches = open?.kind === 'personal' ? issuesSwitchesOf(view, open.pending ? null : open.list, at) : [];
  return (
    <main
      className={MAIN}
      data-issues={open?.kind ?? fixes?.kind}
      data-real-projects={view.show}
      aria-busy={(open && 'pending' in open && open.pending) || undefined}
    >
      <RealProjectsTop backHref={backHref} name={name} of={at} />
      <IssuesFilters chips={issuesChipsOf(view, names, at)} switches={switches} clearHref={null} />
      {open ? (
        <RealProjectsGroup group="open">
          <OpenGroup view={view} at={at} layer={open} shared={shared} handlers={handlers} />
        </RealProjectsGroup>
      ) : null}
      {fixes ? (
        <RealProjectsGroup group="fixed">
          <FixedGroup view={view} at={at} layer={fixes} passed={passed} onRetry={handlers.onRetry} />
        </RealProjectsGroup>
      ) : null}
      <IssuesFoot markdownHref={issuesMarkdownPathOf(view, at)} />
    </main>
  );
}

/** The unavailable state and a failure, in a group's own place. */
function NotHere({ kind, onRetry }: { kind: 'unavailable' | 'failed'; onRetry?: () => void }) {
  if (kind === 'unavailable') {
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
  return (
    <IssuesBox kind="failed" title="Not loaded" text={ISSUES_FAILED}>
      {onRetry ? (
        <Button type="button" variant="outline" className="max-sm:min-h-11" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </IssuesBox>
  );
}

/**
 * "Open": the masked rows with the foot of a masked list under them; with none, the dashed box when the shared list
 * has none either, else the list's own ends ("Turn off …" only where pressing it would show something). When the
 * shared list could not be read, the person's empty list says only what the list's own ends say.
 */
function OpenGroup({
  view,
  at,
  layer,
  shared,
  handlers,
}: {
  view: IssuesView;
  at: Exclude<IssuesAt, 'issues'>;
  layer: Exclude<IssuesLayer, { kind: 'fixed' }>;
  shared: number | null;
  handlers: IssuesHandlers;
}) {
  if (layer.kind === 'unavailable' || layer.kind === 'failed')
    return <NotHere kind={layer.kind} onRetry={handlers.onRetry} />;
  const visitor = layer.kind === 'visitor';
  const rows = visitor ? layer.rows : layer.list.rows;
  if (shared === null && layer.kind === 'personal' && !rows.length) {
    const end = issuesEndOf(view, layer.list, at);
    if (end) return <IssuesEndBox end={end} email={null} />;
  }
  const ends = realProjectsEndsOf({ own: visitor ? null : rows.length, shared: shared ?? rows.length, fixes: 0 });
  if (ends.open === 'none') {
    return (
      <RealProjectsEnd end={realProjectsWordsOf(at).openNone} kind="open-none">
        {at === 'lesson' ? <LessonEmail view={view} layer={layer} handlers={handlers} /> : null}
      </RealProjectsEnd>
    );
  }
  if (ends.open === 'narrowed' && layer.kind === 'personal') {
    const end = issuesEndOf(view, layer.list, at);
    if (end) return <IssuesEndBox end={end} email={null} />;
  }
  return (
    <OpenRows
      rows={rows}
      view={view}
      at={at}
      visitor={visitor}
      handlers={handlers}
      reads={layer.kind === 'personal' ? (layer.reads ?? NO_MASKED_READS) : NO_MASKED_READS}
    />
  );
}

/**
 * "Email me issues for my lessons" in the box of a lesson with no open issue. A visitor's five on the screen are a
 * visitor's, unless the person's own are being read (`pending`); the person's list read again for a new view is the
 * last view's until it lands. The button waits in both cases. The person's list answers the switch, whether it covers
 * this lesson and the address; the Learn sign comes with it.
 */
function LessonEmail({
  view,
  layer,
  handlers,
}: {
  view: IssuesView;
  layer: Extract<IssuesLayer, { kind: 'visitor' | 'personal' }>;
  handlers: IssuesHandlers;
}) {
  const state =
    layer.kind === 'visitor'
      ? lessonIssuesEmailStateOf({ signedIn: !!layer.pending, list: null, sign: null })
      : lessonIssuesEmailStateOf({ signedIn: true, list: layer.pending ? null : layer.list, sign: layer.sign ?? null });
  return <LessonIssuesEmail state={state} back={issuesHrefOf(view, 'lesson')} {...handlers.lessonEmail} />;
}

/** The masked rows. On a lesson's view a row does not repeat the lesson's name; on a course's it names its lesson. */
function OpenRows({
  rows,
  view,
  at,
  visitor,
  handlers,
  reads,
}: {
  rows: readonly IssuesRow[];
  view: IssuesView;
  at: Exclude<IssuesAt, 'issues'>;
  visitor: boolean;
  handlers: IssuesHandlers;
  reads: MaskedListReads;
}) {
  return (
    <MaskedList
      from="learn"
      pageFrom="learn"
      pageView={issuesViewQueryOf(view, at)}
      visitor={visitor}
      reads={reads}
      className="gap-3"
    >
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {rows.map((row) => (
          <li key={row.issue.id} data-learn-only={row.learnOnly ? '' : undefined}>
            <MaskedListRow
              issue={row.issue}
              full={visitor ? null : row.full}
              lesson={at === 'lesson' ? null : rowLessonOf(row, visitor)}
              onReplace={handlers.onSkipped ? (next) => handlers.onSkipped?.(row.issue.id, next) : undefined}
              onLeave={handlers.onLeave ? () => handlers.onLeave?.(row.issue.id) : undefined}
            />
          </li>
        ))}
      </ul>
    </MaskedList>
  );
}

/** "Fixed": the merged fixes, ten at a time, or the dashed box when none is merged yet. */
function FixedGroup({
  view,
  at,
  layer,
  passed,
  onRetry,
}: {
  view: IssuesView;
  at: Exclude<IssuesAt, 'issues'>;
  layer: FixesLayer;
  passed: ReadonlySet<string> | null;
  onRetry?: () => void;
}) {
  if (layer.kind !== 'fixed') return <NotHere kind={layer.kind} onRetry={onRetry} />;
  if (!layer.fixes.rows.length) return <RealProjectsEnd end={realProjectsWordsOf(at).fixedNone} kind="fixed-none" />;
  // The narrowing changes with the address: its fixes start again from their first ten.
  return <FixesPaged key={JSON.stringify(issuesPublicInputOf(view))} view={view} fixes={layer.fixes} passed={passed} />;
}

/** The fixes with "Show N more" in place: the next page's rows join under the ones on the screen. */
function FixesPaged({
  view,
  fixes,
  passed,
}: {
  view: IssuesView;
  fixes: LearnFixes;
  passed: ReadonlySet<string> | null;
}) {
  const [rows, setRows] = useState(fixes.rows);
  const [next, setNext] = useState(fixes.next);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const more = () =>
    startTransition(async () => {
      if (!next) return;
      setFailed(false);
      const read = await readMoreLearnFixes(issuesPublicInputOf(view), next).catch(() => null);
      if (!read) {
        setFailed(true);
        return;
      }
      const shown = new Set(rows.map(fixKeyOf));
      setRows([...rows, ...read.rows.filter((row) => !shown.has(fixKeyOf(row)))]);
      setNext(read.next);
    });
  // With no next page, every fix is on the screen whatever the count said.
  const total = next ? Math.max(fixes.total, rows.length + 1) : rows.length;
  return (
    <div className="flex flex-col gap-3">
      <RealFixes
        rows={rows}
        total={total}
        passed={passed}
        languageOf={fixLanguageWordsOf}
        pending={pending}
        onMore={next ? more : undefined}
      />
      {failed ? (
        <p role="alert" className="m-0 text-sm text-destructive">
          Couldn’t load more. Try again in a minute.
        </p>
      ) : null}
    </div>
  );
}
