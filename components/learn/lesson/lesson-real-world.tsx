'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, Suspense, use, useRef, useState } from 'react';

import { FixCard } from '@/components/learn/issues/issues-parts';
import { PHONE_LINK } from '@/components/learn/phone-link';
import { Button } from '@/components/ui/button';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import { RefChips } from '@/components/workspace/ref-chips';
import { type IssuesRow, type LearnFixes, type LearnFixRow, rowsAfterSkip } from '@/lib/learn/issues';
import {
  allFixesWordsOf,
  LESSON_FIXES_SHOWN,
  LESSON_ISSUES_SHOWN,
  type LearnMyFix,
  type LessonRealMine,
  lessonFixesPathOf,
  lessonIssuesPathOf,
  myFixPathOf,
  myFixWordsOf,
  REAL_WORLD_WORDS,
} from '@/lib/learn/real-issues';
import { cn } from '@/lib/utils';
import { NO_MASKED_READS } from '@/lib/workspace/masked-issue';

/*
 * "In the real world" under a lesson (page 15): the merged fixes that used it and, for a signed-in person, the masked
 * rows of their list for it; with a fix of their own that uses it, that fix comes first, with its address. Left out
 * whole while nothing of it is answered (an API that does not know it yet), so the page is as it was.
 */

const H3 = 'm-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase';
const LIST = 'm-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0';

function Column({ title, kind, children }: { title: string; kind: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3" data-real-column={kind}>
      <h3 className={H3}>{title}</h3>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="m-0 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{children}</p>
);

/** The merged fixes, three at most, each as Issues draws it; or why there are none. */
function FixesList({ rows }: { rows: readonly LearnFixRow[] }) {
  if (!rows.length) return <Empty>{REAL_WORLD_WORDS.fixesNone}</Empty>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.slice(0, LESSON_FIXES_SHOWN).map((fix) => (
        <li key={`${fix.repo}#${fix.number}`} className="flex">
          <FixCard fix={fix} compact />
        </li>
      ))}
    </ul>
  );
}

/** The person's own fix that uses the lesson: where it stands, and its page. */
function YourFix({ fix }: { fix: LearnMyFix }) {
  const words = myFixWordsOf(fix);
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-card p-4"
      data-real-my-fix={fix.state ?? 'STARTED'}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          <RefChips repo={fix.repo} issue={fix.issueNumber} pr={fix.number !== null ? { number: fix.number } : null} />
          <span className="font-semibold text-pretty">{fix.title}</span>
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
            words.merged ? 'bg-positive/10 text-positive' : 'border text-muted-foreground',
          )}
        >
          {words.pill}
        </span>
      </div>
      <p className="m-0 text-sm text-muted-foreground">{words.text}</p>
      <Button asChild variant="outline" className="h-9 self-start px-4 max-sm:min-h-11">
        <Link href={myFixPathOf(fix)} prefetch={false} data-real-my-fix-open="">
          {REAL_WORLD_WORDS.openFix}
        </Link>
      </Button>
    </div>
  );
}

/**
 * The person's issues for the lesson, masked, three at most. A skip's place takes the next row of their list for the
 * lesson that is not on the screen and not skipped; with none, the skipped row leaves. The skip's own next issue is
 * never taken: it comes from the whole list and may be for another lesson.
 */
function IssueRows({ rows: given, reads }: { rows: readonly IssuesRow[]; reads: LessonRealMine['reads'] }) {
  const [rows, setRows] = useState(() => given.slice(0, LESSON_ISSUES_SHOWN));
  const skipped = useRef(new Set<string>());
  if (!rows.length) return <Empty>{REAL_WORLD_WORDS.issuesNone}</Empty>;
  const leave = (id: string) => setRows((was) => was.filter((row) => row.issue.id !== id));
  const replace = (id: string) => {
    skipped.current.add(id);
    setRows((was) => rowsAfterSkip(was, id, given, { leftOut: skipped.current }));
  };
  return (
    <>
      <MaskedList from="learn" pageFrom="learn" reads={reads ?? NO_MASKED_READS} foot={false}>
        <ul className={LIST}>
          {rows.map((row) => (
            <li key={row.issue.id} data-real-issue="" data-learn-only={row.learnOnly ? '' : undefined}>
              <MaskedListRow
                issue={row.issue}
                full={row.full}
                onReplace={() => replace(row.issue.id)}
                onLeave={() => leave(row.issue.id)}
              />
            </li>
          ))}
        </ul>
      </MaskedList>
      <p className="m-0 text-xs text-muted-foreground">{REAL_WORLD_WORDS.issuesNote}</p>
    </>
  );
}

export type LessonRealWorldProps = {
  slug: string;
  /** The lesson's merged fixes as everyone reads them; null when they cannot be read. */
  fixes: LearnFixes | null;
  /** What the signed-in person's route answered; null for a visitor, and while it is on its way. */
  mine: LessonRealMine | null;
};

/** "In the real world", or nothing while none of it is answered. */
export function LessonRealWorld({ slug, fixes: shared, mine }: LessonRealWorldProps) {
  const fixes = shared ?? mine?.fixes ?? null;
  const fix = mine?.real?.fix ?? null;
  const rows = mine?.rows ?? null;
  if (!fixes && !fix && !rows) return null;
  const others =
    fixes && fix ? fixes.rows.filter((row) => !(row.repo === fix.repo && row.issueNumber === fix.issueNumber)) : null;
  const allFixes = fixes ? allFixesWordsOf(fixes.total, Math.min(fixes.rows.length, LESSON_FIXES_SHOWN)) : null;
  const columns: ReactNode[] = [];
  if (fix) {
    columns.push(
      <Column key="mine" title={REAL_WORLD_WORDS.yourFix} kind="mine">
        <YourFix fix={fix} />
      </Column>,
    );
    // The person's own fix the only one: no column of other people's, which would say none used the idea.
    if (others?.length) {
      columns.push(
        <Column key="others" title={REAL_WORLD_WORDS.otherFixes} kind="others">
          <FixesList rows={others} />
        </Column>,
      );
    }
  } else {
    if (fixes) {
      columns.push(
        <Column key="fixes" title={REAL_WORLD_WORDS.fixes} kind="fixes">
          <FixesList rows={fixes.rows} />
        </Column>,
      );
    }
    if (rows) {
      columns.push(
        <Column key="issues" title={REAL_WORLD_WORDS.issues} kind="issues">
          <IssueRows key={rows.map((row) => row.issue.id).join()} rows={rows} reads={mine?.reads ?? null} />
        </Column>,
      );
    }
  }
  const link = cn('text-sm font-semibold text-link hover:underline', PHONE_LINK);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="real-world-title" data-lesson-real-world="">
      <h2 id="real-world-title" className="m-0 text-xl font-semibold">
        {REAL_WORLD_WORDS.title}
      </h2>
      <div className={cn('grid gap-6', columns.length > 1 && 'md:grid-cols-2')}>{columns}</div>
      <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1">
        {allFixes ? (
          <Link href={lessonFixesPathOf(slug)} prefetch={false} className={link} data-real-all-fixes="">
            {allFixes}
          </Link>
        ) : null}
        <Link href={lessonIssuesPathOf(slug) as Route} prefetch={false} className={link} data-real-issues-link="">
          {REAL_WORLD_WORDS.issuesLink}
        </Link>
      </p>
    </section>
  );
}

/** The lesson's merged fixes as everyone reads them: drawn, on their way from the server, or none. */
export type SharedFixes = LearnFixes | Promise<LearnFixes | null> | null;

function Shared({ fixes, ...props }: Omit<LessonRealWorldProps, 'fixes'> & { fixes: Promise<LearnFixes | null> }) {
  return <LessonRealWorld fixes={use(fixes)} {...props} />;
}

/**
 * "In the real world" with the merged fixes still on their way: the rest of it (the person's own parts) is drawn
 * meanwhile, and the fixes join it when they come, so a slow read never holds the lesson.
 */
export function LessonRealWorldStreamed({
  fixes,
  ...props
}: Omit<LessonRealWorldProps, 'fixes'> & { fixes: SharedFixes }) {
  if (!(fixes instanceof Promise)) return <LessonRealWorld fixes={fixes} {...props} />;
  return (
    <Suspense fallback={<LessonRealWorld fixes={null} {...props} />}>
      <Shared fixes={fixes} {...props} />
    </Suspense>
  );
}
