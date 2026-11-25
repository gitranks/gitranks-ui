'use client';

import { Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { RefChips } from '@/components/workspace/ref-chips';
import { type LearnFixRow, mergedOnOf } from '@/lib/learn/issues';
import { learnFixPath } from '@/lib/learn/paths';
import {
  fixesCountLineOf,
  REAL_PROJECTS_GROUPS,
  REAL_PROJECTS_SENTENCE,
  realProjectsTitleOf,
  showMoreOf,
} from '@/lib/learn/real-projects';

/** The top: "← The lesson", "[the lesson's title]: in real projects", and the sentence on what the page holds. */
export function RealProjectsTop({ backHref, name }: { backHref: Route; name: string }) {
  return (
    <div className="flex flex-col gap-1.5" data-real-projects-top="">
      <Link
        href={backHref}
        prefetch={false}
        className="self-start text-sm font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        ← The lesson
      </Link>
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance">{realProjectsTitleOf(name)}</h1>
      <p className="m-0 max-w-[80ch] text-sm text-muted-foreground">{REAL_PROJECTS_SENTENCE}</p>
    </div>
  );
}

/** One of the two groups, "Open" then "Fixed": its name over what it holds, or over the box that says it holds none. */
export function RealProjectsGroup({
  group,
  children,
}: {
  group: keyof typeof REAL_PROJECTS_GROUPS;
  children: ReactNode;
}) {
  const id = `real-projects-${group}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2" data-real-projects-group={group}>
      <h2 id={id} className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {REAL_PROJECTS_GROUPS[group]}
      </h2>
      {children}
    </section>
  );
}

/**
 * A group's end: a dashed box in the group's own place, its title and line, and under them what it offers (the open
 * group's email button, section 9.1, comes with the page's own step).
 */
export function RealProjectsEnd({
  end,
  kind,
  children,
}: {
  end: { title: string; text: string };
  kind: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-start gap-1.5 rounded-xl border border-dashed px-5 py-4"
      data-real-projects-end={kind}
    >
      <p className="m-0 text-sm font-semibold">{end.title}</p>
      <p className="m-0 text-sm text-muted-foreground">{end.text}</p>
      {children ? <div className="mt-1.5 flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}

const CHIP = 'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap text-positive bg-positive/10';

/**
 * A merged fix that used the lesson: the project, its issue and pull request, the language when known, who fixed it,
 * the pull request's title as a link to the fix; on the right "Passed" where the reader passed its walkthrough, the
 * day it merged, and "Open the fix".
 */
export function RealFixRow({
  fix,
  language,
  passed,
}: {
  fix: LearnFixRow;
  /** The language as a person reads it; null when not known, and then left out. */
  language: string | null;
  passed: boolean;
}) {
  const href = learnFixPath({ nameWithOwner: fix.repo, number: fix.number });
  const merged = mergedOnOf(fix.mergedAt);
  return (
    <article
      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
      data-real-fix={`${fix.repo}#${fix.number}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <RefChips repo={fix.repo} issue={fix.issueNumber} pr={{ number: fix.number, url: fix.url }} />
          {language ? <span data-fix-language="">{language}</span> : null}
          <span>fixed by {fix.fixer}</span>
        </div>
        <Link
          href={href}
          prefetch={false}
          className="self-start font-semibold text-pretty text-foreground hover:underline"
        >
          {fix.title}
        </Link>
      </div>
      <div className="flex flex-none flex-wrap items-center gap-3">
        {passed ? (
          <span className={`inline-flex items-center gap-1 ${CHIP}`} data-fix-passed="">
            <Check aria-hidden="true" className="size-3 shrink-0" />
            Passed
          </span>
        ) : null}
        {merged ? <span className={CHIP}>{merged}</span> : null}
        <Button asChild variant="outline" className="max-sm:min-h-11">
          <Link href={href} prefetch={false}>
            Open the fix
          </Link>
        </Button>
      </div>
    </article>
  );
}

/**
 * The "Fixed" group's rows, ten at a time with "Show N more" (N at most ten), and the count only when there are more
 * than ten. `passed` is the set of pull requests (`owner/name#number`) whose walkthrough the reader passed; null while
 * it loads, when it failed, and for a visitor: no "Passed" then. `languageOf` words a row's language, null when not known.
 */
export function RealFixes({
  rows,
  total,
  passed,
  languageOf,
  pending = false,
  onMore,
}: {
  rows: readonly LearnFixRow[];
  total: number;
  passed: ReadonlySet<string> | null;
  languageOf: (fix: LearnFixRow) => string | null;
  pending?: boolean;
  onMore?: () => void;
}) {
  const count = fixesCountLineOf(rows.length, total);
  const more = showMoreOf(rows.length, total);
  return (
    <div className="flex flex-col gap-4" data-real-fixes="">
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {rows.map((fix) => (
          <li key={`${fix.repo}#${fix.number}`}>
            <RealFixRow fix={fix} language={languageOf(fix)} passed={!!passed?.has(`${fix.repo}#${fix.number}`)} />
          </li>
        ))}
      </ul>
      {count || more ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground" data-fixes-count="">
          {count ? <span aria-live="polite">{count}</span> : null}
          {more ? (
            <Button
              type="button"
              variant="outline"
              onClick={onMore}
              disabled={pending || !onMore}
              className="min-h-10 px-4 font-semibold"
            >
              {pending ? 'Loading…' : more}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
