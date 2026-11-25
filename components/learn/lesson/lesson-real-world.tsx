'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, Suspense, use, useLayoutEffect, useRef, useState } from 'react';

import { FixCard } from '@/components/learn/issues/issues-parts';
import { Button } from '@/components/ui/button';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import { PHONE_LINK } from '@/components/workspace/phone-link';
import { RefChips } from '@/components/workspace/ref-chips';
import { type IssuesRow, type LearnFixes, rowsAfterSkip } from '@/lib/learn/issues';
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
 * "In the real world", the last part of a lesson's page (page 15): the merged fixes that used the lesson, then, for a
 * signed-in person, their own fix that uses it or else the masked rows of their list for it. The parts stack in that
 * order, one under another, and a part with nothing in it is not drawn: the fixes come with the page and the person's
 * parts arrive later under them, so nothing already drawn moves or changes width. With nothing at all, no section.
 */

const H3 = 'm-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase';
const LIST = 'm-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0';
const LINK = cn('self-start text-sm font-semibold text-link hover:underline', PHONE_LINK);

function Part({ title, kind, children }: { title: string; kind: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3" data-real-column={kind}>
      <h3 className={H3}>{title}</h3>
      {children}
    </section>
  );
}

/** The merged fixes, three at most, each as Issues draws it, and the link to all of them while more are there. */
function FixesPart({ slug, fixes }: { slug: string; fixes: LearnFixes }) {
  const shown = fixes.rows.slice(0, LESSON_FIXES_SHOWN);
  const all = allFixesWordsOf(fixes.total, shown.length);
  return (
    <Part title={REAL_WORLD_WORDS.fixes} kind="fixes">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {shown.map((fix) => (
          <li key={`${fix.repo}#${fix.number}`} className="flex">
            <FixCard fix={fix} compact />
          </li>
        ))}
      </ul>
      {all ? (
        <Link href={lessonFixesPathOf(slug)} prefetch={false} className={LINK} data-real-all-fixes="">
          {all}
        </Link>
      ) : null}
    </Part>
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
 * The person's issues for the lesson, masked, three at most, with the link to the lesson's open issues. A skip's place
 * takes the next row of their list for the lesson that is not on the screen and not skipped; with none, the skipped
 * row leaves. The skip's own next issue is never taken: it comes from the whole list and may be for another lesson.
 * When the last row leaves, the part goes, and tells the section before the browser paints (`onEmpty`).
 */
function IssuesPart({
  slug,
  rows: given,
  reads,
  onEmpty,
}: {
  slug: string;
  rows: readonly IssuesRow[];
  reads: LessonRealMine['reads'];
  onEmpty: () => void;
}) {
  const [rows, setRows] = useState(() => given.slice(0, LESSON_ISSUES_SHOWN));
  const skipped = useRef(new Set<string>());
  const empty = rows.length === 0;
  useLayoutEffect(() => {
    if (empty) onEmpty();
  }, [empty, onEmpty]);
  if (empty) return null;
  const leave = (id: string) => setRows((was) => was.filter((row) => row.issue.id !== id));
  const replace = (id: string) => {
    skipped.current.add(id);
    setRows((was) => rowsAfterSkip(was, id, given, { leftOut: skipped.current }));
  };
  return (
    <Part title={REAL_WORLD_WORDS.issues} kind="issues">
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
      <Link href={lessonIssuesPathOf(slug) as Route} prefetch={false} className={LINK} data-real-issues-link="">
        {REAL_WORLD_WORDS.issuesLink}
      </Link>
    </Part>
  );
}

export type LessonRealWorldProps = {
  slug: string;
  /** The lesson's merged fixes as everyone reads them; null when they cannot be read. */
  fixes: LearnFixes | null;
  /** What the signed-in person's route answered; null for a visitor, and while it is on its way. */
  mine: LessonRealMine | null;
};

/**
 * "In the real world" with the parts that have something in them, in their order: the merged fixes, then the person's
 * own fix or else their issues for the lesson. Nothing when no part has anything.
 */
export function LessonRealWorld({ slug, fixes: shared, mine }: LessonRealWorldProps) {
  const fixes = shared ?? mine?.fixes ?? null;
  const fix = mine?.real?.fix ?? null;
  const rows = mine?.rows ?? null;
  // The list of the person's rows whose last row has left; a new list starts again.
  const rowsKey = rows ? rows.map((row) => row.issue.id).join() : '';
  const [emptied, setEmptied] = useState<string | null>(null);
  const parts: ReactNode[] = [];
  if (fixes?.rows.length) parts.push(<FixesPart key="fixes" slug={slug} fixes={fixes} />);
  if (fix) {
    parts.push(
      <Part key="mine" title={REAL_WORLD_WORDS.yourFix} kind="mine">
        <YourFix fix={fix} />
      </Part>,
    );
  } else if (rows?.length && emptied !== rowsKey) {
    parts.push(
      <IssuesPart
        key={rowsKey}
        slug={slug}
        rows={rows}
        reads={mine?.reads ?? null}
        onEmpty={() => setEmptied(rowsKey)}
      />,
    );
  }
  if (!parts.length) return null;
  return (
    <section className="flex flex-col gap-6" aria-labelledby="real-world-title" data-lesson-real-world="">
      <h2 id="real-world-title" className="m-0 text-xl font-semibold">
        {REAL_WORLD_WORDS.title}
      </h2>
      {parts}
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
