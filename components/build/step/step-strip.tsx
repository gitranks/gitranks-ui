import Link from 'next/link';

import { BUILD_HOME_PATH, buildProjectPath, buildStepPath } from '@/lib/build/paths';
import type { SquareKind, StripSquare } from '@/lib/build/step-page';
import { cn } from '@/lib/utils';

/*
 * A step's strip, under the site's header: the way back (Build, the project, and the part when the step is in one) on
 * the left, and on the right the step's place and one square for each step of the base or the part. A square is a
 * link to its step. The person's own squares show once read: filled for a step passed, outlined where their build
 * stands. This page's square is ringed. The strip keeps its height while it fills.
 */

/** Each square's look, with and without the ring that marks this page's step. */
const SQUARE: Record<SquareKind, { plain: string; here: string }> = {
  plain: {
    plain: 'bg-muted shadow-[inset_0_0_0_1px_var(--border)]',
    here: 'bg-muted shadow-[inset_0_0_0_1px_var(--border),0_0_0_2px_var(--background),0_0_0_4px_var(--foreground)]',
  },
  done: {
    plain: 'bg-brand-soft-foreground',
    here: 'bg-brand-soft-foreground shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--foreground)]',
  },
  current: {
    plain: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground)]',
    here: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground),0_0_0_2px_var(--background),0_0_0_4px_var(--foreground)]',
  },
};

/** What a square says to a screen reader and on hover: "Step 7: List the tools", with where the person stands. */
function squareLabelOf({ step, kind }: StripSquare): string {
  const label = `Step ${step.number}: ${step.title}`;
  if (kind === 'done') return `${label}, passed`;
  if (kind === 'current') return `${label}, your build is here`;
  return label;
}

export function StepStrip({
  project,
  part,
  place,
  squares,
}: {
  project: { slug: string; name: string };
  part: { slug: string; name: string } | null;
  /** "Step 7 of 16". */
  place: string;
  squares: readonly StripSquare[];
}) {
  return (
    <div className="border-b bg-background" data-build-step-strip="">
      <div className="mx-auto flex min-h-11 w-full max-w-[860px] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2.5">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href={BUILD_HOME_PATH} className="whitespace-nowrap hover:underline">
            Build
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={buildProjectPath(project.slug)} className="whitespace-nowrap hover:underline">
            {project.name}
          </Link>
          {part ? (
            <>
              <span aria-hidden="true">/</span>
              <span className="whitespace-nowrap">{part.name}</span>
            </>
          ) : null}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm whitespace-nowrap text-muted-foreground" data-build-step-place="">
            {place}
          </span>
          {squares.length ? (
            <div className="flex flex-wrap items-center gap-[5px]" data-build-squares="">
              {squares.map((square) => {
                const label = squareLabelOf(square);
                return (
                  <Link
                    key={square.step.slug}
                    href={buildStepPath(project.slug, square.step.slug)}
                    title={label}
                    aria-label={label}
                    aria-current={square.here ? 'step' : undefined}
                    className={cn(
                      'block size-3.5 rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      SQUARE[square.kind][square.here ? 'here' : 'plain'],
                    )}
                    data-square={square.kind}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
