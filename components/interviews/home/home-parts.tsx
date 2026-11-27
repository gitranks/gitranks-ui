import { ChevronRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { CompanyLogo } from '@/components/interviews/company-logo';
import { plansCountOf, positionsLineOf, ROUND_MARK_LOOK } from '@/lib/interviews/home';
import { interviewCompanyPath } from '@/lib/interviews/paths';
import type { InterviewCompanyCard, InterviewCompanyRef, InterviewRoundState } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/*
 * The parts Interviews home draws in more than one place: the companies as cards, plans as rows, and a plan's rounds
 * as marks.
 */

/** A list in one bordered box, its rows split by hairlines. */
export const BOX_LIST = 'm-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0';
const ROW_SPLIT = 'border-t first:border-t-0';
export const TEXT_LINK = 'font-medium text-link hover:underline';

/** The companies as cards: the logo and the name, the positions, how many plans; "Your plan" on the person's own. */
export function CompanyCards({
  companies,
  mine,
}: Readonly<{ companies: readonly InterviewCompanyCard[]; mine?: ReadonlySet<string> }>) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2" data-interviews-companies="">
      {companies.map((card) => (
        <li key={card.company.slug} className="flex">
          <Link
            href={interviewCompanyPath(card.company.slug)}
            className="flex w-full flex-col gap-1.5 rounded-lg border bg-card p-4 hover:bg-accent"
            data-company-card={card.company.slug}
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <CompanyLogo company={card.company} size={28} />
                <span className="text-base font-semibold">{card.company.name}</span>
              </span>
              {mine?.has(card.company.slug) ? (
                <span className="whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground">
                  Your plan
                </span>
              ) : null}
            </span>
            {card.positions.length ? (
              <span className="text-sm text-muted-foreground">{positionsLineOf(card)}</span>
            ) : null}
            {card.plans.length ? (
              <span className="mt-auto pt-2 text-xs text-muted-foreground">{plansCountOf(card)}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One plan as a row: the company, the plan's name, a short line on the right; the whole row is the link. */
export type PlanRowLine = { key: string; company: InterviewCompanyRef; name: string; right: string; href: Route };

/** Plans as rows in one box. */
export function PlanRows({ rows, label }: Readonly<{ rows: readonly PlanRowLine[]; label?: string }>) {
  return (
    <ul className={BOX_LIST} aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className={ROW_SPLIT}>
          <Link
            href={row.href}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-accent"
            data-plan-row={row.key}
          >
            <CompanyLogo company={row.company} size={20} />
            <span className="min-w-48 flex-1 text-sm" data-plan-row-name="">
              <span className="font-medium">{row.company.name}</span>
              <span className="text-muted-foreground">
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                {row.name}
              </span>
            </span>
            {row.right ? (
              <span className="whitespace-nowrap text-xs text-muted-foreground" data-plan-row-right="">
                {row.right}
              </span>
            ) : null}
            <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A plan's rounds as marks, in order: done, the one the person is in, to come, nothing to prepare. */
export function RoundMarks({ rounds }: Readonly<{ rounds: readonly { key: string; state: InterviewRoundState }[] }>) {
  if (!rounds.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-[5px]" aria-hidden="true" data-round-marks="">
      {rounds.map((round) => (
        <span
          key={round.key}
          data-round-mark={round.state}
          className={cn('block h-3.5 w-7 rounded-[3px]', ROUND_MARK_LOOK[round.state])}
        />
      ))}
    </span>
  );
}
