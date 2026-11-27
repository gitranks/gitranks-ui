import Link from 'next/link';

import { PlanRows, RoundMarks, TEXT_LINK } from './home-parts';
import { CompanyLogo } from '@/components/interviews/company-logo';
import { buttonVariants } from '@/components/ui/button';
import { planBoxOf, planRowNameOf, roundOfLine } from '@/lib/interviews/home';
import { INTERVIEWS_ABOUT_PATH, INTERVIEWS_RESEARCH_PATH, interviewPlanPath } from '@/lib/interviews/paths';
import type { InterviewPlanRow } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/*
 * The person's home: what to do now, in one box for the plan worked on last; their other plans in progress as rows.
 * The companies and the search follow, then the way to how Interviews works at the foot.
 */

const MAIN_BUTTON = cn(buttonVariants({ size: 'lg' }), 'font-semibold');
const SECOND_BUTTON = cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'font-semibold');

/** The box of the plan to go on with: its name and round, the rounds as marks, the next thing and its one button. */
export function PlanBox({ row }: Readonly<{ row: InterviewPlanRow }>) {
  const box = planBoxOf(row);
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
      aria-label="What to do now"
      data-plan-box={`${row.plan.company.slug}/${row.plan.slug}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold">
          <CompanyLogo company={row.plan.company} size={20} />
          <span>{box.title}</span>
        </h2>
        {box.round ? <span className="text-sm text-muted-foreground">{box.round}</span> : null}
      </div>
      {row.rounds.length || box.next || box.done ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <RoundMarks rounds={row.rounds} />
          {box.done || box.next ? (
            <span className="text-sm" data-plan-next="">
              {box.done ? `${box.done} ` : null}
              {box.next ? (
                <>
                  Next:{' '}
                  <Link href={box.next.href} className={TEXT_LINK}>
                    {box.next.name}
                  </Link>
                  {box.next.lessons ? `, ${box.next.lessons}` : null}
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {box.next ? (
          <>
            <Link href={box.next.href} className={MAIN_BUTTON}>
              Continue with {box.next.name}
            </Link>
            <Link href={box.plan} className={SECOND_BUTTON}>
              Open the plan
            </Link>
          </>
        ) : (
          <Link href={box.plan} className={MAIN_BUTTON}>
            Open the plan
          </Link>
        )}
      </div>
      <p className="m-0 text-xs text-muted-foreground">Your interview plans are not publicly visible.</p>
    </section>
  );
}

/** The person's other plans in progress, one row each. Not shown with one plan. */
export function OtherPlans({ rows }: Readonly<{ rows: readonly InterviewPlanRow[] }>) {
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby="interviews-other-plans-title">
      <h2 id="interviews-other-plans-title" className="m-0 text-xl font-bold tracking-tight">
        Your other plans
      </h2>
      <PlanRows
        rows={rows.map((row) => ({
          key: `${row.plan.company.slug}/${row.plan.slug}`,
          company: row.plan.company,
          name: planRowNameOf(row.plan),
          right: roundOfLine(row),
          href: interviewPlanPath(row.plan.company.slug, row.plan.slug),
        }))}
      />
    </section>
  );
}

/** The foot of the person's home: the way to how Interviews works and how we research. */
export function MineFoot() {
  return (
    <p className="m-0 text-xs text-muted-foreground" data-interviews-foot="">
      <Link href={INTERVIEWS_ABOUT_PATH} className="hover:underline">
        How Interviews works
      </Link>
      <span aria-hidden="true"> · </span>
      <Link href={INTERVIEWS_RESEARCH_PATH} className="hover:underline">
        How we research
      </Link>
    </p>
  );
}
