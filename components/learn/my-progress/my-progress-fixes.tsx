import Link from 'next/link';
import type { ReactNode } from 'react';

import { HomeIssuesEmail } from '@/components/learn/home/home-issues-email';
import { ShareButton } from '@/components/share/share-button';
import { Button } from '@/components/ui/button';
import { RefChips } from '@/components/workspace/ref-chips';
import { countWords } from '@/lib/learn/course';
import {
  FIXED_ISSUES_PATH,
  fixesLineOf,
  fixLessonWordsOf,
  fixPagePathOf,
  fixPillOf,
  fixWalkthroughPathOf,
  MY_ISSUES_PATH,
  type MyFixRow,
  type MyFixState,
  type MyWalkthroughRow,
  myFixPagePath,
  NO_FIX_LEAD,
  NO_FIX_TITLE,
  NO_WALKTHROUGH_TITLE,
  type NoFixEnd,
  noFixLineOf,
  noWalkthroughLineOf,
  passedWordsOf,
  pullUrlOf,
  readersWordsOf,
  walkthroughsLineOf,
} from '@/lib/learn/my-progress-fixes';
import { learnLessonPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

/*
 * My progress's views of real fixes as page 18's boards draw them, from plain data: "Your fixes", "Walkthroughs", each
 * with its line beside the switch, its empty end, and its list on its way or not loaded. The live page moves them; the
 * catalogue draws each state from a fixture.
 */

/** A number as the boards write it: the mono face, in the text's colour. */
function Figure({ count }: { count: number }) {
  return <span className="font-mono font-semibold text-foreground tabular-nums">{countWords(count)}</span>;
}

/** "3 merged in 3 projects · 1 open · 1 closed", each part only when above zero. */
export function FixesLine({ fixes }: { fixes: readonly MyFixRow[] }) {
  const line = fixesLineOf(fixes);
  if (!line) return null;
  const parts: ReactNode[] = [];
  if (line.merged) {
    parts.push(
      <span key="merged">
        <Figure count={line.merged} /> merged in {countWords(line.projects)}{' '}
        {line.projects === 1 ? 'project' : 'projects'}
      </span>,
    );
  }
  if (line.open) {
    parts.push(
      <span key="open">
        <Figure count={line.open} /> open
      </span>,
    );
  }
  if (line.closed) {
    parts.push(
      <span key="closed">
        <Figure count={line.closed} /> closed
      </span>,
    );
  }
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? ' · ' : null}
          {part}
        </span>
      ))}
    </>
  );
}

/** "6 walkthroughs of other people’s fixes passed". */
export function WalkthroughsLine({ walkthroughs }: { walkthroughs: readonly MyWalkthroughRow[] }) {
  const line = walkthroughsLineOf(walkthroughs);
  if (!line) return null;
  return (
    <>
      <Figure count={line.count} /> {line.words}
    </>
  );
}

const PILL = 'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
const PILL_TONE: Record<MyFixState, string> = {
  OPEN: 'bg-brand-soft text-brand-soft-foreground',
  MERGED: 'bg-positive/10 text-positive',
  CLOSED: 'bg-muted text-muted-foreground',
};

/** A row of a list: the chips and what else sits above the title, the title, its line, then the row's end. */
function Row({
  id,
  top,
  title,
  line,
  end,
}: {
  id: string;
  top: ReactNode;
  title: ReactNode;
  line: ReactNode;
  end: ReactNode;
}) {
  return (
    <li data-row={id}>
      <article className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{top}</div>
          {title}
          {line ? <span className="text-sm text-muted-foreground">{line}</span> : null}
        </div>
        <div className="flex flex-none flex-wrap items-center gap-3">{end}</div>
      </article>
    </li>
  );
}

const LessonLink = ({ slug, title }: { slug: string; title: string }) => (
  <Link href={learnLessonPath(slug)} className="font-medium text-foreground hover:underline">
    {title}
  </Link>
);

/** A fix: its chips, its title (the person's pull request page), what it did to a lesson, its readers, its pill. */
function FixRow({ fix, today }: { fix: MyFixRow; today: string }) {
  const page = myFixPagePath(fix);
  const lesson = fixLessonWordsOf(fix);
  const readers = readersWordsOf(fix.readers);
  const pill = fixPillOf(fix, today);
  const line =
    lesson || readers ? (
      <>
        {lesson ? (
          <>
            {lesson.before}
            <LessonLink slug={lesson.lesson.slug} title={lesson.lesson.title} />
            {lesson.after}
          </>
        ) : null}
        {lesson && readers ? ' ' : null}
        {readers}
      </>
    ) : null;
  return (
    <Row
      id={`${fix.repo}#${fix.issueNumber}`}
      top={<RefChips repo={fix.repo} issue={fix.issueNumber} pr={{ number: fix.number, url: pullUrlOf(fix) }} />}
      title={
        <Link href={page} className="font-semibold text-pretty text-foreground hover:underline">
          {fix.title}
        </Link>
      }
      line={line}
      end={
        <>
          <span className={cn(PILL, PILL_TONE[pill.tone])} data-fix-state={fix.state}>
            {pill.words}
          </span>
          <Button asChild variant="outline" className="max-sm:min-h-11">
            <Link href={page}>
              Open your fix<span className="sr-only">: {fix.title}</span>
            </Link>
          </Button>
        </>
      }
    />
  );
}

/** "Your fixes": every pull request of the person's that Learn opened, newest first, in one box. */
export function FixesList({ fixes, today }: { fixes: readonly MyFixRow[]; today: string }) {
  return (
    <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0" data-my-fixes="">
      {fixes.map((fix) => (
        <FixRow key={`${fix.repo}#${fix.issueNumber}#${fix.number}`} fix={fix} today={today} />
      ))}
    </ul>
  );
}

/** A walkthrough passed: the fix's chips and fixer, its title (the fix's page), its lesson, when, and its two actions. */
function WalkthroughRow({ walkthrough, today }: { walkthrough: MyWalkthroughRow; today: string }) {
  return (
    <Row
      id={`${walkthrough.repo}#${walkthrough.number}`}
      top={
        <>
          <RefChips
            repo={walkthrough.repo}
            issue={walkthrough.issueNumber}
            pr={{ number: walkthrough.number, url: pullUrlOf(walkthrough) }}
          />
          <span>fixed by {walkthrough.fixer}</span>
        </>
      }
      title={
        <Link href={fixPagePathOf(walkthrough)} className="font-semibold text-pretty text-foreground hover:underline">
          {walkthrough.title}
        </Link>
      }
      line={
        walkthrough.lesson ? (
          <>
            Used <LessonLink slug={walkthrough.lesson.slug} title={walkthrough.lesson.title} />.
          </>
        ) : null
      }
      end={
        <>
          <span className={cn(PILL, PILL_TONE.MERGED)}>{passedWordsOf(walkthrough.passedAt, today)}</span>
          <ShareButton
            href={fixWalkthroughPathOf(walkthrough)}
            label="Copy link"
            title={walkthrough.title}
            className="max-sm:min-h-11"
          />
          <Button asChild variant="outline" className="max-sm:min-h-11">
            <Link href={fixWalkthroughPathOf(walkthrough)}>
              Open it again<span className="sr-only">: {walkthrough.title}</span>
            </Link>
          </Button>
        </>
      }
    />
  );
}

/** "Walkthroughs": the walkthroughs of other people's fixes the person passed, newest first, in one box. */
export function WalkthroughsList({
  walkthroughs,
  today,
}: {
  walkthroughs: readonly MyWalkthroughRow[];
  today: string;
}) {
  return (
    <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0" data-my-walkthroughs="">
      {walkthroughs.map((walkthrough) => (
        <WalkthroughRow key={`${walkthrough.repo}#${walkthrough.number}`} walkthrough={walkthrough} today={today} />
      ))}
    </ul>
  );
}

/** A view with nothing in it: its title, a line, and its one way on, in a dashed box. */
function ViewEmpty({
  state,
  title,
  text,
  children,
}: {
  state: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6" data-view-empty={state}>
      <h3 className="m-0 text-lg font-semibold text-muted-foreground">{title}</h3>
      <p className="m-0 max-w-[64ch] text-sm text-muted-foreground">{text}</p>
      {children}
    </section>
  );
}

/**
 * "Your fixes" with nothing in it: issues fit the person, so the box leads to them; none fits now, so it offers the
 * email for one, not a way to an empty list. When neither could be read, the box says what a fix does and leads to
 * Issues.
 */
export function NoFixes({ end }: { end: NoFixEnd }) {
  if (end.openIssues) {
    return (
      <ViewEmpty state="fixes-issues" title={NO_FIX_TITLE} text={noFixLineOf(end.openIssues)}>
        <Button asChild variant="outline" className="max-sm:min-h-11">
          <Link href={MY_ISSUES_PATH}>See the issues</Link>
        </Button>
      </ViewEmpty>
    );
  }
  if (end.email) {
    return (
      <ViewEmpty state="fixes-email" title={NO_FIX_TITLE} text={noFixLineOf(null)}>
        <HomeIssuesEmail on={end.email.emailOn} to={end.email.emailTo} />
      </ViewEmpty>
    );
  }
  return (
    <ViewEmpty state="fixes" title={NO_FIX_TITLE} text={NO_FIX_LEAD}>
      <Button asChild variant="outline" className="max-sm:min-h-11">
        <Link href={MY_ISSUES_PATH}>See the issues</Link>
      </Button>
    </ViewEmpty>
  );
}

/** "Walkthroughs" with nothing in it: the merged fixes that have one when there are any, else no button. */
export function NoWalkthroughs({ fixes }: { fixes: number | null }) {
  return (
    <ViewEmpty
      state={fixes ? 'walkthroughs-fixes' : 'walkthroughs'}
      title={NO_WALKTHROUGH_TITLE}
      text={noWalkthroughLineOf(fixes)}
    >
      {fixes ? (
        <Button asChild variant="outline" className="max-sm:min-h-11">
          <Link href={FIXED_ISSUES_PATH}>See the fixed issues</Link>
        </Button>
      ) : null}
    </ViewEmpty>
  );
}

/** A view's list on its way: its box at a size, nothing in it yet. */
export function ViewListPending({ label }: { label: string }) {
  return (
    <div className="flex min-h-64 flex-col rounded-xl border bg-card p-5" aria-busy="true" data-view-list="pending">
      <span className="sr-only" role="status">
        {label}
      </span>
    </div>
  );
}

/** A view's list did not come: a line, and the way to ask again. */
export function ViewListFailed({ text, onReload }: { text: string; onReload: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5" data-view-list="failed">
      <p className="m-0 text-sm text-muted-foreground" role="status">
        {text}
      </p>
      <Button type="button" variant="outline" className="max-sm:min-h-11" onClick={onReload}>
        Try again
      </Button>
    </div>
  );
}
