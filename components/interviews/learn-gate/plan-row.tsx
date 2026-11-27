'use client';

import { ChevronRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CompanyLogo } from '@/components/interviews/company-logo';
import { readInterviewsKeyWithin } from '@/components/interviews/interviews-read';
import { interviewsOpenForDocument } from '@/components/interviews/interviews-viewer';
import { type LearnPlanRow, learnPlanRowOf } from '@/lib/interviews/learn-course';
import { INTERVIEWS_MY_HOME_MINE_PATH } from '@/lib/interviews/paths';
import type { InterviewsMyHome } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';
import { cn } from '@/lib/utils';

/*
 * The row of the plan to go on with, above Learn home's three boxes and at the top of My progress: which plan, where
 * the person stands and what comes next. The whole row is the way on and holds no button, so the page's one lit box
 * stays its main action. With more plans, the others are one press away on My interviews.
 */

/** The person's plans in progress, as a page serves them once Interviews is open to everyone. */
export type ServedLearnPlans = InterviewsMyHome | null;

/**
 * The row as this browser knows it: from the served plans once Interviews is open to everyone (`served` given), else
 * read from the person's route once their browser knows Interviews is open to them. None until then, for anyone it is
 * closed to, with no plan, and with every round done.
 */
export function useLearnPlanRow(served?: ServedLearnPlans): LearnPlanRow | null {
  const [read, setRead] = useState<LearnPlanRow | null>(null);
  const serving = served !== undefined;
  useEffect(() => {
    if (serving || !hasSessionHint(document.cookie)) return;
    let live = true;
    void interviewsOpenForDocument().then(async (open) => {
      if (!open || !live) return;
      const home = await readInterviewsKeyWithin(INTERVIEWS_MY_HOME_MINE_PATH, 'home');
      if (live) setRead(learnPlanRowOf(home as InterviewsMyHome | null));
    });
    return () => {
      live = false;
    };
  }, [serving]);
  const fromServer = useMemo(() => (serving ? learnPlanRowOf(served) : null), [serving, served]);
  return serving ? fromServer : read;
}

/** The row, drawn: the plan's logo and name, where the person stands and what is next, then the other plans. */
export function LearnPlanRowView({ row, className }: Readonly<{ row: LearnPlanRow; className?: string }>) {
  const where = (
    <>
      {row.round ? `${row.round} · ` : null}Next: <span className="font-medium text-foreground">{row.next}</span>
    </>
  );
  return (
    <div
      className={cn('flex flex-col overflow-hidden rounded-xl border bg-card sm:flex-row', className)}
      data-plan-row=""
    >
      <Link
        href={row.href as Route}
        className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3.5 hover:bg-accent sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 sm:px-5"
        data-plan-row-next=""
      >
        <span className="flex min-w-0 flex-1 items-start gap-3 sm:min-w-[280px] sm:items-center">
          <CompanyLogo company={row.company} size={28} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Your interview plan
            </span>
            <span className="text-base font-semibold text-pretty">{row.title}</span>
            <span className="text-sm text-muted-foreground sm:hidden">{where}</span>
          </span>
        </span>
        <span className="text-sm text-muted-foreground max-sm:hidden">{where}</span>
        <span className="text-muted-foreground max-sm:mt-0.5">
          <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        </span>
      </Link>
      {row.more ? (
        <Link
          href={row.moreHref as Route}
          className="shrink-0 border-t px-4 py-2.5 text-sm font-medium whitespace-nowrap text-link hover:underline sm:flex sm:items-center sm:self-stretch sm:border-t-0 sm:border-l sm:px-5"
          data-plan-row-more=""
        >
          {row.more}
        </Link>
      ) : null}
    </div>
  );
}

/** The row on a page of Learn: none until the person's plans are known, and none with nothing to go on with. */
export function LearnPlanRowLive({ served, className }: Readonly<{ served?: ServedLearnPlans; className?: string }>) {
  const row = useLearnPlanRow(served);
  return row ? <LearnPlanRowView row={row} className={className} /> : null;
}
