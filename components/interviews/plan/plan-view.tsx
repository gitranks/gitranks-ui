import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

import { PlanBox, type PlanBoxProps } from './plan-box';
import { PlanRound } from './plan-round';
import { RoundLine, RoundLineAfterRow, RoundLineRow } from './round-line';
import { INTERVIEWS_COLUMN } from '@/components/interviews/column';
import { CompanyLogo } from '@/components/interviews/company-logo';
import { BasisChip } from '@/components/interviews/sources/basis-chip';
import {
  INTERVIEWS_ABOUT_PATH,
  interviewCompanyPath,
  interviewPlanMarkdownPath,
  interviewPlanPath,
} from '@/lib/interviews/paths';
import {
  boxMarksOf,
  countWordsOf,
  factTextOf,
  jumpedAheadOf,
  type PlanBox as PlanBoxState,
  planFactsOf,
  planNoticeOf,
  roundSizeOf,
} from '@/lib/interviews/plan';
import { roundLineOf } from '@/lib/interviews/round-line';
import { dayWordsOf } from '@/lib/interviews/sources';
import type { InterviewPlanCard, InterviewPlanMine, InterviewPlanPage } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/*
 * A plan's page, as the approved designs draw it: one reading column. What it is; the box "what to do now"; the rounds
 * on one line, solid behind the person and grey ahead, going on dashed through what happens after the interviews; the
 * company's other plans. A section with nothing in it is not shown, heading included.
 *
 * The page comes drawn for a visitor. While a browser with a session reads the person's side (`reading`), the box and
 * the rounds stay hidden in their place, so a person never sees the visitor's box first; the stylesheet shows them
 * after the read's time limit, so a late read never leaves a hole. Back from signing in, they stay hidden while the
 * plan starts (`starting`, which the page ends by its own time limit).
 */

/** How the box and the rounds are held: hidden by the stylesheet until its reveal, or hidden while the plan starts. */
const heldClassOf = (reading: boolean, starting: boolean) =>
  starting
    ? 'invisible'
    : reading
      ? '[html[data-has-session]_&]:invisible [html[data-has-session]_&]:animate-build-reveal'
      : undefined;

const SECTION_TITLE = 'm-0 text-xl font-bold tracking-tight';

/** What it is: the way back to the company, the logo and the name, the line, the facts and the notice. */
function PlanHead({ plan }: { plan: InterviewPlanPage }) {
  const facts = planFactsOf(plan);
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={interviewCompanyPath(plan.company.slug)}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {plan.company.name} interviews
      </Link>
      <h1 className="m-0 flex items-center gap-3 text-3xl font-bold tracking-tight text-balance">
        <CompanyLogo company={plan.company} size={40} />
        <span className="min-w-0">
          {plan.company.name} · {plan.name}
        </span>
      </h1>
      {plan.line.trim() && <p className="m-0 text-base leading-relaxed">{plan.line}</p>}
      {facts.length > 0 && (
        <p data-plan-facts className="m-0 text-sm text-muted-foreground">
          {facts.map((fact, index) => (
            <Fragment key={fact}>
              {index > 0 && <span aria-hidden="true"> · </span>}
              {fact}
            </Fragment>
          ))}
        </p>
      )}
      <p data-plan-notice className="m-0 text-xs text-muted-foreground">
        {planNoticeOf(plan)}
      </p>
    </div>
  );
}

/** The rounds on one line, then what happens after the interviews. */
function PlanRounds({ plan, mine }: { plan: InterviewPlanPage; mine: InterviewPlanMine | null }) {
  if (!plan.rounds.length) return null;
  const after = plan.after.filter((fact) => fact.name.trim());
  const marks = roundLineOf(plan.rounds, mine, { after: after.length > 0 });
  const line = after.length
    ? 'One line, from the first call to the offer.'
    : 'One line, in the order the rounds happen.';
  return (
    <section data-plan-rounds aria-labelledby="rounds-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="rounds-title" className={SECTION_TITLE}>
          The rounds
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          {line}
          {jumpedAheadOf(mine) && ' Open any round and start anything in it.'}
        </p>
      </div>
      <RoundLine>
        {plan.rounds.map((round, index) => (
          <RoundLineRow key={round.key} mark={marks[index]} last={!after.length && index === plan.rounds.length - 1}>
            <PlanRound plan={plan} round={round} size={roundSizeOf(round, mine)} mine={mine} />
          </RoundLineRow>
        ))}
        {after.length > 0 && (
          <>
            <RoundLineAfterRow dot={false}>
              <span className="text-xs font-semibold text-muted-foreground">
                After the interviews: nothing to prepare, it is what happens next
              </span>
            </RoundLineAfterRow>
            {after.map((fact, index) => (
              <RoundLineAfterRow key={fact.key} last={index === after.length - 1}>
                <div data-plan-after={fact.key} className="flex flex-col gap-1 pt-1 pb-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-medium">{fact.name}</span>
                    <BasisChip basis={fact.basis} company={plan.company.name} />
                  </div>
                  {factTextOf(fact) && <span className="text-sm text-muted-foreground">{factTextOf(fact)}</span>}
                </div>
              </RoundLineAfterRow>
            ))}
          </>
        )}
      </RoundLine>
    </section>
  );
}

/** "Software engineer · N1": a plan of the company as a row, with how many rounds it has. */
function OtherPlans({ plan }: { plan: InterviewPlanPage }) {
  const others = plan.others.filter((other: InterviewPlanCard) => other.slug !== plan.slug);
  if (!others.length) return null;
  return (
    <section data-plan-others aria-labelledby="others-title" className="flex flex-col gap-4">
      <h2 id="others-title" className={SECTION_TITLE}>
        Other plans at {plan.company.name}
      </h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0">
        {others.map((other) => {
          const levels = other.levelNames.filter((name) => name.trim());
          const rounds = countWordsOf(other.roundCount, 'round', 'rounds');
          return (
            <li key={other.slug} className="border-t first:border-t-0">
              <Link
                href={interviewPlanPath(other.company.slug, other.slug)}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 hover:bg-accent"
              >
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{other.name}</span>
                  {levels.length > 0 && (
                    <>
                      <span aria-hidden="true"> · </span>
                      {levels.join(' and ')}
                    </>
                  )}
                </span>
                {rounds && <span className="whitespace-nowrap text-xs text-muted-foreground">{rounds}</span>}
                <span className="text-muted-foreground">
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The foot line: how many sources, the day of the last check, how we research, and the page's Markdown copy. */
function PlanFoot({ plan }: { plan: InterviewPlanPage }) {
  const checked = dayWordsOf(plan.checkedAt);
  const parts = [
    plan.sources.length > 0
      ? `Facts from ${plan.sources.length} public ${plan.sources.length === 1 ? 'source' : 'sources'}, written in our own words`
      : null,
    checked ? `last checked ${checked}` : null,
  ].filter((part): part is string => !!part);
  return (
    <p data-plan-foot className="m-0 text-xs text-muted-foreground">
      {parts.map((part, index) => (
        <Fragment key={part}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          {part}
        </Fragment>
      ))}
      {parts.length > 0 && <span aria-hidden="true"> · </span>}
      <Link href={INTERVIEWS_ABOUT_PATH} className="hover:underline">
        How we research
      </Link>
      <span aria-hidden="true"> · </span>
      <a href={interviewPlanMarkdownPath(plan.company.slug, plan.slug)} className="hover:underline">
        Markdown version
      </a>
    </p>
  );
}

export type PlanViewProps = Omit<PlanBoxProps, 'box' | 'marks'> & {
  box: PlanBoxState;
  /** The person's read of the plan; none for a visitor, and until it comes. */
  mine: InterviewPlanMine | null;
  /** A browser with a session is reading the person's side: the box and the rounds stay hidden in their place. */
  reading?: boolean;
  /** Back from signing in, the plan is starting: the box and the rounds stay hidden in their place. */
  starting?: boolean;
};

/** A plan's page, for whoever reads it. */
export function PlanView({ plan, box, mine, reading = false, starting = false, ...actions }: PlanViewProps) {
  const held = reading || starting;
  const heldClass = heldClassOf(reading, starting);
  return (
    <main data-plan-page={`${plan.company.slug}/${plan.slug}`} className={INTERVIEWS_COLUMN}>
      <div className="flex flex-col gap-5">
        <PlanHead plan={plan} />
        <div data-plan-held={held ? '' : undefined} aria-busy={held || undefined} className={heldClass}>
          <PlanBox plan={plan} box={box} marks={boxMarksOf(plan, mine)} {...actions} />
        </div>
      </div>
      <div data-plan-held={held ? '' : undefined} className={cn('flex flex-col gap-10', heldClass)}>
        <PlanRounds plan={plan} mine={mine} />
      </div>
      <OtherPlans plan={plan} />
      <PlanFoot plan={plan} />
    </main>
  );
}
