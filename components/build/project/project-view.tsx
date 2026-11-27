import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

import { ProjectBox } from './project-box';
import { ProjectSteps } from './project-steps';
import { BUILD_PROJECTS_PATH, buildCoursePath } from '@/lib/build/paths';
import { boxBuildOf, needRowsOf, type ProjectSide, projectFactsOf, whatNextOf } from '@/lib/build/project';
import type { BuildMine, BuildProjectPage } from '@/lib/build/types';
import { cn } from '@/lib/utils';

/*
 * A project's page, as the approved designs draw it: one reading column. What it is; the box "what to do now"; for a
 * built project, "What next"; what you will have; the steps; the Learn courses that help; what you need. Once the
 * person has a build of the project, the sections about starting are not shown: the page is the box, then the steps
 * with their place. A section with nothing in it is not shown, heading included.
 */

/** The public repository of every project's code, one branch for each project and language. */
export const BUILD_CODE_URL = 'https://github.com/gitranks/build';

const SECTION_TITLE = 'm-0 text-xl font-bold tracking-tight';
const LIST = 'm-0 flex list-none flex-col overflow-hidden rounded-lg border bg-card p-0';

/** What it is: the way back to all projects, the name, the line, and the facts. */
function ProjectHead({ project }: { project: BuildProjectPage }) {
  const facts = projectFactsOf(project);
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={BUILD_PROJECTS_PATH}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All projects
      </Link>
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{project.name}</h1>
      <p className="m-0 text-base leading-relaxed">{project.line}</p>
      <p data-project-facts className="m-0 text-sm text-muted-foreground">
        {facts.map((fact, index) => (
          <Fragment key={fact}>
            {index > 0 && <span aria-hidden="true"> · </span>}
            {fact}
          </Fragment>
        ))}
      </p>
    </div>
  );
}

/** "What next", for a built project: only the doors that lead somewhere; none, and the section is not there. */
export function WhatNext({ project, build }: { project: BuildProjectPage; build: BuildMine }) {
  const doors = whatNextOf(project, build);
  if (!doors.length) return null;
  return (
    <section data-project-next aria-labelledby="next-title" className="flex flex-col gap-3">
      <h2 id="next-title" className={SECTION_TITLE}>
        What next
      </h2>
      <ul className={LIST}>
        {doors.map((door, index) => (
          <li key={door.label} className={cn(index > 0 && 'border-t')}>
            <Link href={door.href} className="flex items-center justify-between gap-3 p-3 hover:bg-accent">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">{door.label}</span>
                <span className="text-sm font-medium">{door.title}</span>
                <span className="text-sm text-muted-foreground">{door.line}</span>
              </span>
              <span className="text-muted-foreground">
                <ChevronRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What you will have: the project's own lines. */
function WhatYouWillHave({ project }: { project: BuildProjectPage }) {
  const lines = project.about.filter((line) => line.trim());
  if (!lines.length) return null;
  return (
    <section data-project-have aria-labelledby="have-title" className="flex flex-col gap-3">
      <h2 id="have-title" className={SECTION_TITLE}>
        What you will have
      </h2>
      <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-base leading-relaxed">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

/** Before you start: the Learn courses that help. Advice, never a gate. */
function BeforeYouStart({ project }: { project: BuildProjectPage }) {
  const { courses } = project;
  if (!courses.length) return null;
  return (
    <section data-project-courses aria-labelledby="before-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="before-title" className={SECTION_TITLE}>
          Before you start
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          {courses.length === 1
            ? 'This Learn course helps. It is not needed: you can start now.'
            : 'These Learn courses help. None is needed: you can start now.'}
        </p>
      </div>
      <ul className={LIST}>
        {courses.map((course, index) => (
          <li key={course.slug} className={cn(index > 0 && 'border-t')}>
            <Link
              href={buildCoursePath(course.slug)}
              className="flex items-center justify-between gap-3 p-3 hover:bg-accent"
            >
              <span className="text-sm font-medium">{course.name}</span>
              <span className="text-muted-foreground">
                <ChevronRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What you need: the runtimes in one row, then everything else, each with why. */
function WhatYouNeed({ project }: { project: BuildProjectPage }) {
  const rows = needRowsOf(project);
  if (!rows.length) return null;
  return (
    <section data-project-needs aria-labelledby="needs-title" className="flex flex-col gap-3">
      <h2 id="needs-title" className={SECTION_TITLE}>
        What you need
      </h2>
      <ul className={LIST}>
        {rows.map((row, index) => (
          <li key={row.name} className={cn('flex flex-col gap-0.5 p-3', index > 0 && 'border-t')}>
            <span className="text-sm font-medium">{row.name}</span>
            {row.why && <span className="text-sm text-muted-foreground">{row.why}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export type ProjectViewProps = {
  project: BuildProjectPage;
  side: ProjectSide;
  /** The optional parts drawn open from the start, by slug (the designs draw them so). */
  openParts?: readonly string[];
};

/** A project's page, for whoever reads it. */
export function ProjectView({ project, side, openParts }: ProjectViewProps) {
  const build = boxBuildOf(side);
  const starting = !build;
  return (
    <main
      data-project-page={project.slug}
      className="mx-auto flex w-full max-w-[860px] flex-col gap-8 px-4 pt-6 pb-16 sm:gap-10 sm:pt-8"
    >
      <div className="flex flex-col gap-5">
        <ProjectHead project={project} />
        <ProjectBox project={project} side={side} />
      </div>
      {build?.state.kind === 'built' && <WhatNext project={project} build={build} />}
      {starting && <WhatYouWillHave project={project} />}
      <ProjectSteps project={project} build={build} openParts={openParts} />
      {starting && <BeforeYouStart project={project} />}
      {starting && <WhatYouNeed project={project} />}
      <p className="m-0 text-xs text-muted-foreground">
        Written and checked by GitRanks
        <span aria-hidden="true"> · </span>
        <a href={BUILD_CODE_URL} className="hover:underline">
          The code on GitHub
        </a>
      </p>
    </main>
  );
}
