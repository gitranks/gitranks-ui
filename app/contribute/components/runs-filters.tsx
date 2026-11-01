'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useId, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_RANGE, RANGES, type RunsQuery, type RunsRange, runsHref } from '@/lib/contribute/runs';

/** The "Any …" item: Radix takes no empty value. */
const ANY = 'any';

const RUNNERS = [
  { value: ANY, label: 'Any runner' },
  { value: 'MANAGED_AGENTS', label: 'Hosted' },
  { value: 'MCP', label: 'Your own agent' },
] as const;

/** The filters past the outcome chips, by the label each one's trigger says; the default dates are none. */
export function activeRunFiltersOf(query: RunsQuery): string[] {
  return [
    query.repo,
    query.runner ? RUNNERS.find(({ value }) => value === query.runner)?.label : undefined,
    query.range !== DEFAULT_RANGE ? RANGES.find(({ value }) => value === query.range)?.label : undefined,
  ].filter((label): label is string => !!label);
}

/**
 * Repo, runner and dates, behind one Filters button that counts the ones set, as on the Issues page; Clear drops them
 * all, the outcome chips too. Each change replaces the URL, so the page reads its first page again.
 */
export function RunsFilters({ query, repos }: { query: RunsQuery; repos: string[] }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const active = activeRunFiltersOf(query);
  // A repo from the URL that has no runs yet stays pickable, so the trigger still names it.
  const repoOptions = query.repo && !repos.includes(query.repo) ? [query.repo, ...repos] : repos;

  const change = (next: Partial<RunsQuery>) =>
    startTransition(() => router.replace(runsHref({ ...query, ...next }) as Route, { scroll: false }));

  const fields = [
    {
      key: 'repo',
      label: 'Repo',
      value: query.repo ?? ANY,
      options: [{ value: ANY, label: 'All repos' }, ...repoOptions.map((repo) => ({ value: repo, label: repo }))],
      onChange: (value: string) => change({ repo: value === ANY ? undefined : value }),
    },
    {
      key: 'runner',
      label: 'Runner',
      value: query.runner ?? ANY,
      options: RUNNERS,
      onChange: (value: string) =>
        change({ runner: value === ANY ? undefined : (value as NonNullable<RunsQuery['runner']>) }),
    },
    {
      key: 'range',
      label: 'Dates',
      value: query.range,
      options: RANGES,
      onChange: (value: string) => change({ range: value as RunsRange }),
    },
  ];

  return (
    <div className="flex items-center gap-1" aria-busy={pending} data-run-filters={active.length}>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="rounded-lg">
            <SlidersHorizontal aria-hidden="true" />
            Filters
            {active.length ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                {active.length}
              </span>
            ) : null}
            {active.length ? <span className="sr-only">: {active.join(', ')}</span> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl">
          {fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-${field.key}`} className="text-xs font-medium text-muted-foreground">
                {field.label}
              </label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={`${id}-${field.key}`} className="w-full rounded-lg">
                  <SelectValue>{field.options.find((option) => option.value === field.value)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </PopoverContent>
      </Popover>
      {active.length || query.outcome || query.reason ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            change({ outcome: undefined, reason: undefined, repo: undefined, runner: undefined, range: DEFAULT_RANGE })
          }
          className="text-muted-foreground"
        >
          Clear
          <span className="sr-only"> the filters</span>
        </Button>
      ) : null}
    </div>
  );
}
