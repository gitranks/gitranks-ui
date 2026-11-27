'use client';

import { Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { BUILD_COLUMN } from '@/components/build/column';
import { HowBuildWorksFoot } from '@/components/build/home/home-landing';
import { ProjectCards } from '@/components/build/project-card';
import { cardPlacesOf } from '@/lib/build/project-card';
import { isGroupedList, projectsCountOf, projectsSearchOf } from '@/lib/build/projects';
import type { BuildMine, BuildProjectCard } from '@/lib/build/types';
import { cn } from '@/lib/utils';

export type ProjectsViewProps = {
  /** Every live project, in our order: the same for everyone. */
  projects: readonly BuildProjectCard[];
  /** Every build of the signed-in person's; null for a visitor, and until read. */
  mine: readonly BuildMine[] | null;
  /** For the catalogue: a search already typed. */
  query?: string;
};

/**
 * All projects: the title and one line, then the cards in our order, the same for everyone. From nine projects on,
 * they are grouped by subject and a search box filters them as the person types: the box and the count keep their
 * place, a group with no match is left out. A signed-in person's place shows on the line above a card's facts.
 */
export function ProjectsView({ projects, mine, query: typedFirst = '' }: ProjectsViewProps) {
  const [typed, setTyped] = useState(typedFirst);
  const input = useRef<HTMLInputElement>(null);
  const grouped = isGroupedList(projects);
  const search = useMemo(() => projectsSearchOf(projects, grouped ? typed : ''), [projects, grouped, typed]);
  const places = useMemo(() => (mine ? cardPlacesOf(mine) : null), [mine]);
  const placeOf = places ? (slug: string) => places.get(slug) ?? null : undefined;
  const hinted = mine === null;
  const count = projectsCountOf(search);
  const nothing = search.query !== '' && search.shown === 0;
  const showAll = () => {
    setTyped('');
    input.current?.focus();
  };

  return (
    <main className={cn(BUILD_COLUMN, 'gap-6 sm:gap-8')} data-build-projects={grouped ? 'grouped' : 'few'}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-bold tracking-tight">Projects</h1>
        <p className="m-0 text-base leading-relaxed">
          Real, small things to build with your own agent, one step at a time. Each ends in something that works.
        </p>
      </div>
      {grouped ? (
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
          <label className="flex h-10 max-w-[420px] min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={input}
              type="search"
              aria-label="Search projects"
              placeholder="Search projects"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setTyped('');
              }}
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {typed ? (
              <button
                type="button"
                aria-label="Clear"
                onClick={showAll}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <span className="text-sm whitespace-nowrap text-muted-foreground" data-projects-count="">
            {count}
          </span>
          <p className="sr-only" role="status">
            {search.query ? (nothing ? 'No project matches.' : count) : ''}
          </p>
        </div>
      ) : null}
      {nothing ? (
        <p className="m-0 text-sm break-words" data-projects-nothing="">
          No project matches “{search.query}”.{' '}
          <button type="button" onClick={showAll} className="font-medium text-link hover:underline">
            Show all {search.total}
          </button>
        </p>
      ) : grouped ? (
        search.groups.map((group) => (
          <section
            key={group.subject}
            className="flex flex-col gap-2"
            aria-labelledby={`build-subject-${group.subject}`}
            data-projects-group={group.subject}
          >
            <h2 id={`build-subject-${group.subject}`} className="m-0 text-base font-semibold">
              {group.name}
            </h2>
            <ProjectCards cards={group.cards} placeOf={placeOf} hinted={hinted} />
          </section>
        ))
      ) : projects.length ? (
        <ProjectCards cards={projects} placeOf={placeOf} hinted={hinted} />
      ) : null}
      <HowBuildWorksFoot lead="New projects are added one at a time." />
    </main>
  );
}
