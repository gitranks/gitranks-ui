import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { countWordsOf, type RoundMark, roundMarksOf, roundOfWordsOf } from '@/lib/interviews/company';
import { interviewLessonPath, interviewPlanPath } from '@/lib/interviews/paths';
import type { InterviewPlanRow } from '@/lib/interviews/types';

/** How each round's mark is drawn: passed, the one the person is in, still to come. */
const MARK_STYLE: Record<RoundMark, { background: string; boxShadow: string }> = {
  done: { background: 'var(--brand-soft-foreground)', boxShadow: 'none' },
  here: { background: 'var(--brand-soft)', boxShadow: 'inset 0 0 0 2px var(--brand-soft-foreground)' },
  ahead: { background: 'var(--muted)', boxShadow: 'inset 0 0 0 1px var(--border)' },
};

/** The plan's rounds as a row of marks, the one the person is in outlined. They only mirror the words beside them. */
function RoundMarks({ row }: Readonly<{ row: InterviewPlanRow }>) {
  const marks = roundMarksOf(row);
  if (!marks.length) return null;
  return (
    <span aria-hidden="true" className="flex flex-wrap items-center gap-[5px]" data-round-marks="">
      {marks.map((mark, index) => (
        <span key={index} data-round-mark={mark} className="block h-3.5 w-7 rounded-[3px]" style={MARK_STYLE[mark]} />
      ))}
    </span>
  );
}

/**
 * The box on top of a company's page for a person with a plan in progress there: the plan worked on last, where they
 * stand, the next thing and one button to go on with it, and that their plans are private.
 */
export function CompanyBox({ row }: Readonly<{ row: InterviewPlanRow }>) {
  const { plan, next } = row;
  const company = plan.company.slug;
  const planHref = interviewPlanPath(company, plan.slug);
  const nextHref = next?.lesson ? interviewLessonPath(next.lesson, company, plan.slug) : planHref;
  const roundOf = roundOfWordsOf(row);
  return (
    <section
      aria-label="What to do now"
      data-company-box={plan.slug}
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 text-base font-semibold">Your plan: {plan.name}</h2>
        {roundOf && <span className="text-sm text-muted-foreground">{roundOf}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 empty:hidden">
        <RoundMarks row={row} />
        {next && (
          <span className="text-sm">
            Next:{' '}
            <Link href={nextHref} className="font-medium text-link hover:underline">
              {next.itemName}
            </Link>
            {next.lessons > 0 && `, ${countWordsOf(next.lessons, 'lesson')}`}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {next ? (
          <>
            <Button asChild size="lg" className="font-semibold">
              <Link href={nextHref}>Continue with {next.itemName}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-semibold">
              <Link href={planHref}>Open the plan</Link>
            </Button>
          </>
        ) : (
          <Button asChild size="lg" className="font-semibold">
            <Link href={planHref}>Open the plan</Link>
          </Button>
        )}
      </div>
      <p className="m-0 text-xs text-muted-foreground">Your interview plans are not publicly visible.</p>
    </section>
  );
}
