import Link from 'next/link';

import {
  filesOf,
  type LandingProofPr,
  mergedAfterOf,
  proofByOf,
  proofIssueMarksOf,
} from '@/lib/contribute/landing-proof';
import { cn } from '@/lib/utils';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

const CARD = 'flex flex-col gap-2.5 rounded-xl border bg-card px-5 py-4 shadow-xs';
const CHIP =
  'inline-flex items-center rounded-full border border-transparent bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80';

/**
 * The landing's top card: one real pull request sent through GitRanks, the newest merged one with a public page (else
 * the newest open one). The issue, how the fix was made, then the pull request with its change and who sent it, and the
 * link to how it was made. A fact that is not known is left out.
 */
export function LandingProofCard({ pr, className }: { pr: LandingProofPr; className?: string }) {
  const marks = proofIssueMarksOf(pr.issue);
  const after = mergedAfterOf(pr);
  return (
    <figure
      aria-label={`A pull request ${pr.mergedAt ? 'merged' : 'sent'} through GitRanks Contribute`}
      className={cn('m-0 flex min-w-0 flex-col gap-3.5', className)}
      data-landing-proof-card={pr.mergedAt ? 'merged' : 'open'}
    >
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-mono">
            {pr.nameWithOwner} · #{pr.issue.number}
          </span>
          <span>the issue</span>
        </div>
        {pr.issue.title ? <span className="font-semibold">{pr.issue.title}</span> : null}
        {marks.length ? (
          <div className="flex flex-wrap gap-1.5">
            {marks.map((mark) => (
              <span key={mark} className={CHIP}>
                {mark}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div aria-hidden="true" className="flex items-center gap-2.5 pl-5 font-mono text-xs text-muted-foreground">
        <span className="h-8 w-0.5 bg-primary/30" />
        an agent wrote the fix · a person reviewed it and sent it
      </div>
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold',
              pr.mergedAt ? 'bg-primary text-primary-foreground' : 'border text-foreground',
            )}
          >
            {pr.mergedAt ? 'Merged' : 'Open'}
          </span>
          {after ? <span className="text-xs text-muted-foreground">{after}</span> : null}
        </div>
        <span className="font-semibold">{pr.title}</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
          {pr.change ? (
            <>
              <span>
                <span className="text-positive">+{pr.change.added}</span>{' '}
                <span className="text-negative">−{pr.change.removed}</span>
              </span>
              <span className="text-muted-foreground">{filesOf(pr.change.files)}</span>
            </>
          ) : null}
          <span className="text-muted-foreground">{proofByOf(pr)}</span>
        </div>
        <Link href={prTimelinePath(pr)} className="self-start text-sm font-semibold text-link hover:underline">
          How it was made →
        </Link>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        {pr.mergedAt
          ? 'A real pull request, the newest one merged through GitRanks.'
          : 'A real pull request, the newest one sent through GitRanks.'}
      </figcaption>
    </figure>
  );
}
