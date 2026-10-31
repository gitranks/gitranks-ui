'use client';

import { SlidersHorizontal } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useId, useTransition } from 'react';

import { type IssuesQuery, issuesHref } from './issues-filter';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KINDS, LANGUAGES, SIZES } from '@/lib/contribute/format';

/** The "All …" item: Radix takes no empty value, so no filter is this, and back to `undefined` on change. */
export const ALL = 'all';

/** Each filter's items, the "All …" one first; the trigger says the label of the one picked. */
export const FILTER_OPTIONS = {
  language: [
    { value: ALL, label: 'All languages' },
    ...Object.entries(LANGUAGES).map(([value, label]) => ({ value, label })),
  ],
  kind: [{ value: ALL, label: 'All kinds' }, ...Object.entries(KINDS).map(([value, label]) => ({ value, label }))],
  size: [
    { value: ALL, label: 'Any size' },
    ...Object.entries(SIZES).map(([value, label]) => ({ value, label: `Up to ${label.toLowerCase()}, where known` })),
  ],
} satisfies Record<'language' | 'kind' | 'size', { value: string; label: string }[]>;

type Filter = keyof typeof FILTER_OPTIONS;

const LABELS: Record<Filter, string> = { language: 'Language', kind: 'Kind', size: 'Largest size, where known' };

/** The filters set in `query`, by the label each one's trigger says. */
export const activeFiltersOf = (query: IssuesQuery) =>
  (Object.keys(FILTER_OPTIONS) as Filter[]).flatMap((filter) => {
    const value = query[filter];
    const option = value ? FILTER_OPTIONS[filter].find((each) => each.value === value) : undefined;
    return option ? [option.label] : [];
  });

/**
 * Language, kind and size, behind one Filters button that counts the ones set; Clear drops them all. Each change
 * starts the feed again from its first page.
 */
export function IssuesFilters({ query }: { query: IssuesQuery }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const active = activeFiltersOf(query);

  const change = (next: Partial<IssuesQuery>) =>
    startTransition(() => router.replace(issuesHref({ ...query, ...next, after: undefined }) as Route));

  return (
    <div className="flex items-center gap-1" aria-busy={pending} data-filters={active.length}>
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
          {(Object.keys(FILTER_OPTIONS) as Filter[]).map((filter) => {
            const value = query[filter] ?? ALL;
            const options = FILTER_OPTIONS[filter];
            return (
              <div key={filter} className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-${filter}`} className="text-xs font-medium text-muted-foreground">
                  {LABELS[filter]}
                </label>
                <Select
                  value={value}
                  onValueChange={(next) =>
                    change({ [filter]: next === ALL ? undefined : next } as Partial<IssuesQuery>)
                  }
                >
                  <SelectTrigger id={`${id}-${filter}`} className="w-full rounded-lg">
                    <SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
      {active.length ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => change({ language: undefined, kind: undefined, size: undefined })}
          className="text-muted-foreground"
        >
          Clear
          <span className="sr-only"> the filters</span>
        </Button>
      ) : null}
    </div>
  );
}
