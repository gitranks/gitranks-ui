'use client';

import { Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { buildStepPath } from '@/lib/build/paths';
import {
  baseWordsOf,
  type PartStanding,
  partStandingOf,
  type StepMark,
  stepMarksOf,
  stepsWordsOf,
} from '@/lib/build/project';
import type { BuildMine, BuildPart, BuildProjectPage, BuildStepRef } from '@/lib/build/types';
import { cn } from '@/lib/utils';

/*
 * "The steps": the base, a row for each step, then the optional parts, each folded to one row that opens its steps in
 * place, under it. Every step is a link to its page. The person's build marks its passed steps, the step it stands on,
 * and its built parts; the marks come in place when the person's side is read.
 */

/** One step as a row: its number, its title, and the build's mark. */
function StepRow({
  project,
  step,
  mark,
  first,
  inPart,
}: {
  project: string;
  step: BuildStepRef;
  mark: StepMark | undefined;
  first: boolean;
  inPart: boolean;
}) {
  return (
    <li data-step-row={step.slug} data-mark={mark} className={cn(!first && 'border-t')}>
      <Link
        href={buildStepPath(project, step.slug)}
        className={cn('flex items-center gap-3 py-2 pr-3 hover:bg-accent', inPart ? 'pl-11' : 'pl-3')}
      >
        <span className="w-5 text-right font-mono text-xs text-muted-foreground tabular-nums">{step.number}</span>
        <span className={cn('min-w-0 flex-1 text-sm', mark === 'current' && 'font-semibold')}>{step.title}</span>
        {mark === 'done' && (
          <span className="text-positive">
            <Check aria-hidden="true" className="size-4" />
            <span className="sr-only">Passed</span>
          </span>
        )}
        {mark === 'current' && (
          <span className="whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground">
            You are here
          </span>
        )}
      </Link>
    </li>
  );
}

/** One optional part: a row that opens its steps in place. */
function PartRow({
  project,
  part,
  standing,
  marks,
  first,
  opened,
}: {
  project: string;
  part: BuildPart;
  standing: PartStanding;
  marks: ReadonlyMap<string, StepMark>;
  first: boolean;
  /** Drawn open from the start (the designs draw a part opened); else folded, as the list opens. */
  opened: boolean;
}) {
  const [open, setOpen] = useState(opened);
  const stepsId = useId();
  return (
    <li data-part-row={part.slug} className={cn(!first && 'border-t')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={stepsId}
        onClick={() => setOpen((was) => !was)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent"
      >
        <span
          className={cn(
            'text-muted-foreground transition-transform motion-reduce:transition-none',
            open && 'rotate-90',
          )}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{part.name}</span>
          <span className="text-sm text-muted-foreground">{part.line}</span>
        </span>
        {standing.built && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-positive">
            <Check aria-hidden="true" className="size-4" />
            Built
          </span>
        )}
        {standing.done !== null && (
          <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
            {standing.done} of {part.steps.length}
          </span>
        )}
        <span className="whitespace-nowrap text-xs text-muted-foreground">{stepsWordsOf(part.steps.length)}</span>
      </button>
      {open && (
        <ol id={stepsId} className="m-0 list-none bg-[color-mix(in_oklch,var(--muted)_45%,transparent)] p-0">
          {part.steps.map((step) => (
            <StepRow key={step.slug} project={project} step={step} mark={marks.get(step.slug)} first={false} inPart />
          ))}
        </ol>
      )}
    </li>
  );
}

type StepsProps = {
  project: BuildProjectPage;
  build: BuildMine | null;
  /** The parts drawn open from the start, by slug. */
  openParts?: readonly string[];
};

/** The optional parts, each folded to one row; none, and the block is not there. */
export function ProjectParts({ project, build, openParts = [] }: StepsProps) {
  if (!project.partsFull.length) return null;
  const marks = stepMarksOf(build);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="m-0 text-base font-semibold">Optional parts</h3>
        <span className="text-sm text-muted-foreground">
          After the base, in any order. Each ends in something that works.
        </span>
      </div>
      <ul data-project-parts className="m-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0">
        {project.partsFull.map((part, index) => (
          <PartRow
            key={part.slug}
            project={project.slug}
            part={part}
            standing={partStandingOf(part, build)}
            marks={marks}
            first={index === 0}
            opened={openParts.includes(part.slug)}
          />
        ))}
      </ul>
    </div>
  );
}

/** The steps of a project, with the marks of the person's build (none for a visitor). */
export function ProjectSteps({ project, build, openParts }: StepsProps) {
  const marks = stepMarksOf(build);
  return (
    <section aria-labelledby="steps-title" className="flex flex-col gap-5">
      <h2 id="steps-title" className="m-0 text-xl font-bold tracking-tight">
        The steps
      </h2>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h3 className="m-0 text-base font-semibold">The base</h3>
          <span className="text-sm text-muted-foreground">
            {baseWordsOf(project)}. Finishing it, and the test, makes the project Built.
          </span>
        </div>
        <ol data-project-base className="m-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0">
          {project.base.map((step, index) => (
            <StepRow
              key={step.slug}
              project={project.slug}
              step={step}
              mark={marks.get(step.slug)}
              first={index === 0}
              inPart={false}
            />
          ))}
        </ol>
      </div>
      <ProjectParts project={project} build={build} openParts={openParts} />
    </section>
  );
}
