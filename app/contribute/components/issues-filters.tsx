'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useId, useTransition } from 'react';

import { type IssuesQuery, issuesHref } from './issues-filter';
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

/** Language, kind and size: each change starts the feed again from its first page. */
export function IssuesFilters({ query }: { query: IssuesQuery }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  const change = (next: Partial<IssuesQuery>) =>
    startTransition(() => router.replace(issuesHref({ ...query, ...next, after: undefined }) as Route));

  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending}>
      {(Object.keys(FILTER_OPTIONS) as Filter[]).map((filter) => {
        const value = query[filter] ?? ALL;
        const options = FILTER_OPTIONS[filter];
        return (
          <div key={filter} className="contents">
            <label htmlFor={`${id}-${filter}`} className="sr-only">
              {LABELS[filter]}
            </label>
            <Select
              value={value}
              onValueChange={(next) => change({ [filter]: next === ALL ? undefined : next } as Partial<IssuesQuery>)}
            >
              <SelectTrigger id={`${id}-${filter}`} className="min-w-40 rounded-lg">
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
    </div>
  );
}
