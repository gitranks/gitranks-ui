import Link from 'next/link';

import { buildStepPath } from '@/lib/build/paths';
import { minutesWordsOf, needLinesOf } from '@/lib/build/step-page';
import type { BuildProjectPage } from '@/lib/build/types';
import { cn } from '@/lib/utils';

/*
 * What the first step of the base adds to its page, read from its project: the steps of the base, with how long they
 * take, and what the project needs. Each section is left out when it has nothing to list.
 */

export function StepPlan({ project, here }: { project: BuildProjectPage; here: string }) {
  const minutes = minutesWordsOf(project.minutes);
  const needs = needLinesOf(project.needsFull);
  return (
    <>
      {project.base.length ? (
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="build-step-plan" data-build-step-plan="">
          <div className="flex flex-col gap-1">
            <h2 id="build-step-plan" className="m-0 text-xl font-bold tracking-tight">
              {project.base.length === 1 ? 'The step of the base' : `The ${project.base.length} steps of the base`}
            </h2>
            <p className="m-0 text-sm text-muted-foreground">
              {minutes ? `${minutes}. ` : ''}Each step adds one thing you can try.
            </p>
          </div>
          <ol className="m-0 grid list-none gap-x-8 rounded-lg border bg-card px-4 py-2 sm:grid-cols-2">
            {project.base.map((step, index) => (
              <li
                key={step.slug}
                className={cn(
                  'flex items-baseline gap-3 border-t py-1.5',
                  index === 0 && 'border-t-0',
                  index === 1 && 'sm:border-t-0',
                )}
              >
                <span className="w-5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {step.number}
                </span>
                <Link
                  href={buildStepPath(project.slug, step.slug)}
                  className={cn('text-sm hover:underline', step.slug === here && 'font-semibold')}
                  aria-current={step.slug === here ? 'page' : undefined}
                >
                  {step.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {needs.length ? (
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="build-step-needs" data-build-step-needs="">
          <h2 id="build-step-needs" className="m-0 text-xl font-bold tracking-tight">
            What you need
          </h2>
          <ul className="m-0 flex list-none flex-col rounded-lg border bg-card p-0">
            {needs.map((need, index) => (
              <li key={need.name} className={cn('flex flex-col gap-0.5 p-3', index > 0 && 'border-t')}>
                <span className="text-sm font-medium">{need.name}</span>
                {need.why ? <span className="text-sm text-muted-foreground">{need.why}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
