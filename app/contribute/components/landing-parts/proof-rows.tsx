import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { H2, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { type LandingProofPr, proofRowLineOf } from '@/lib/contribute/landing-proof';
import { cn } from '@/lib/utils';
import { LEDGER_PATH } from '@/lib/workspace/paths';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

const CHIP =
  'inline-flex items-center rounded-full border border-transparent bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80 hover:underline';

/** One pull request merged through GitRanks: the project, the issue and the pull request, its title, when and by whom. */
export function LandingProofRow({ pr }: { pr: LandingProofPr }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono">{pr.nameWithOwner}</span>
          <a href={pr.issue.url} className={CHIP} rel="noreferrer">
            Issue #{pr.issue.number}
          </a>
          <a href={pr.url} className={CHIP} rel="noreferrer">
            Pull request #{pr.number}
          </a>
        </span>
        <span className="font-semibold text-balance">{pr.title}</span>
        <span className="text-sm text-muted-foreground">{proofRowLineOf(pr)}</span>
      </div>
      <Link href={prTimelinePath(pr)} className={cn(buttonVariants({ variant: 'outline' }), 'max-sm:min-h-11')}>
        How it was made
      </Link>
    </li>
  );
}

/**
 * "Merged through GitRanks": the three newest merged pull requests that have a public page, newest first, and the link
 * to the public ledger while it is open. No count.
 */
export function LandingProofRows({ rows, ledgerOpen }: { rows: readonly LandingProofPr[]; ledgerOpen: boolean }) {
  return (
    <section aria-labelledby="merged-title" className="border-t" data-landing="merged">
      <div className={cn(WIDTH, 'flex flex-col gap-6 py-11 sm:py-16')}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <h2 id="merged-title" className={cn(H2, 'm-0')}>
            Merged through GitRanks
          </h2>
          {ledgerOpen ? (
            <Link href={LEDGER_PATH} className="font-semibold text-link hover:underline">
              Every pull request, in the public ledger →
            </Link>
          ) : null}
        </div>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((pr) => (
            <LandingProofRow key={`${pr.nameWithOwner}#${pr.number}`} pr={pr} />
          ))}
        </ul>
      </div>
    </section>
  );
}
