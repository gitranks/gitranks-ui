'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useId, useTransition } from 'react';

import { type IssuesQuery, issuesHref } from './issues-filter';
import { KINDS, LANGUAGES, SIZES } from '@/lib/contribute/format';

const selectClass = 'rounded-lg border border-input bg-background px-2.5 py-2 text-sm text-foreground';

/** Language, kind and size: each change starts the feed again from its first page. */
export function IssuesFilters({ query }: { query: IssuesQuery }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();

  const change = (next: Partial<IssuesQuery>) =>
    startTransition(() => router.replace(issuesHref({ ...query, ...next, after: undefined }) as Route));

  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending}>
      <label htmlFor={`${id}-language`} className="sr-only">
        Language
      </label>
      <select
        id={`${id}-language`}
        value={query.language ?? ''}
        onChange={(event) => change({ language: (event.target.value || undefined) as IssuesQuery['language'] })}
        className={selectClass}
      >
        <option value="">All languages</option>
        {Object.entries(LANGUAGES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-kind`} className="sr-only">
        Kind
      </label>
      <select
        id={`${id}-kind`}
        value={query.kind ?? ''}
        onChange={(event) => change({ kind: (event.target.value || undefined) as IssuesQuery['kind'] })}
        className={selectClass}
      >
        <option value="">All kinds</option>
        {Object.entries(KINDS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-size`} className="sr-only">
        Largest size, where known
      </label>
      <select
        id={`${id}-size`}
        value={query.size ?? ''}
        onChange={(event) => change({ size: (event.target.value || undefined) as IssuesQuery['size'] })}
        className={selectClass}
      >
        <option value="">Any size</option>
        {Object.entries(SIZES).map(([value, label]) => (
          <option key={value} value={value}>
            Up to {label.toLowerCase()}, where known
          </option>
        ))}
      </select>
    </div>
  );
}
