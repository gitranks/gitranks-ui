'use client';

import { Search } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';

import { fetchEntityFacts } from '../hooks/use-entity-facts';
import { entityName } from '../utils/badge-options';
import { parseSearch } from '../utils/builder-state';
import { avatarOf, KIND_LABELS } from './entity-chip';
import type { EntityFacts } from '@/badge/v3/facts';
import type { EntityKind } from '@/badge/v3/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRepoPath } from '@/utils/repo-paths';

const HEADINGS: Record<EntityKind | 'any', string> = {
  any: 'Who is the badge for?',
  user: 'Which developer is the badge for?',
  org: 'Which organization is the badge for?',
  repo: 'Which repository is the badge for?',
};

const LABELS: Record<EntityKind | 'any', string> = {
  any: 'A developer, an organization or a repository',
  user: 'GitHub login',
  org: 'Organization login',
  repo: 'Repository',
};

const HINTS: Record<EntityKind | 'any', string> = {
  any: '“owner/name” finds a repository; a login finds a developer or an organization.',
  user: 'The developer’s GitHub login, for example torvalds.',
  org: 'The organization’s GitHub login, for example vercel.',
  repo: 'The repository as owner/name, for example facebook/react.',
};

const PLACEHOLDERS: Record<EntityKind | 'any', string> = {
  any: 'torvalds, vercel or facebook/react',
  user: 'torvalds',
  org: 'vercel',
  repo: 'facebook/react',
};

type Lookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; found: EntityFacts[] }
  | { status: 'error' };

type FindStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Narrows the search to one kind (`?repo=`, `?user=`, `?org=`). */
  kind: EntityKind | null;
  initialQuery: string;
  notice: string | null;
  onPick: (kind: EntityKind, name: string) => void;
  onAnyKind: () => void;
};

/** What a search asks for: the kinds it can be, in the order results are listed. */
function kindsFor(target: NonNullable<ReturnType<typeof parseSearch>>, narrowed: EntityKind | null): EntityKind[] {
  if (target.kind === 'repo') return narrowed && narrowed !== 'repo' ? [] : ['repo'];
  if (narrowed === 'repo') return [];
  return narrowed ? [narrowed] : ['user', 'org'];
}

const INVALID: Record<EntityKind | 'any', string> = {
  any: 'Enter a GitHub login or owner/name',
  user: 'Enter a GitHub login',
  org: 'Enter an organization login',
  repo: 'Enter the repository as owner/name',
};

/** Step 1: one search box; a login finds developers and organizations, `owner/name` a repository. */
export function FindStep({ headingRef, kind, initialQuery, notice, onPick, onAnyKind }: Readonly<FindStepProps>) {
  const scope = kind ?? 'any';
  const [query, setQuery] = useState(initialQuery);
  const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const hintId = useId();
  const statusId = useId();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (lookup.status === 'done' && lookup.found.length) {
      resultsRef.current?.querySelector('button')?.focus();
    }
  }, [lookup]);

  const search = async () => {
    const target = parseSearch(query);
    const kinds = target ? kindsFor(target, kind) : [];
    if (!target || !kinds.length) {
      inputRef.current?.setCustomValidity(INVALID[scope]);
      inputRef.current?.reportValidity();
      return;
    }
    setLookup({ status: 'loading' });
    try {
      const answers = await Promise.all(kinds.map((each) => fetchEntityFacts(each, target.name)));
      setLookup({ status: 'done', query: target.name, found: answers.filter((facts) => facts !== null) });
    } catch {
      setLookup({ status: 'error' });
    }
  };

  const missing = lookup.status === 'done' && !lookup.found.length ? lookup.query : null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {HEADINGS[scope]}
      </h2>

      {notice && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/5 px-3 py-2 text-sm">
          {notice}
        </p>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label htmlFor={inputId} className="text-sm font-medium">
          {LABELS[scope]}
        </label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={inputId}
            value={query}
            placeholder={PLACEHOLDERS[scope]}
            aria-describedby={hintId}
            onChange={(event) => {
              event.target.setCustomValidity('');
              setQuery(event.target.value);
            }}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            className="h-10 min-w-0 flex-1"
          />
          <Button type="submit" size="lg" disabled={lookup.status === 'loading'} className="shrink-0">
            {lookup.status === 'loading' ? (
              <ClipLoader size={16} color="currentColor" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            Find
          </Button>
        </div>
        <p id={hintId} className="text-xs text-muted-foreground">
          {HINTS[scope]}{' '}
          {kind && (
            <button
              type="button"
              onClick={onAnyKind}
              className="font-medium text-link underline-offset-2 hover:underline"
            >
              Search all kinds
            </button>
          )}
        </p>
      </form>

      <div id={statusId} aria-live="polite" className="flex flex-col gap-2">
        {lookup.status === 'error' && (
          <p className="text-sm text-negative">GitRanks could not look that up just now. Try again in a moment.</p>
        )}
        {missing && <MissingNote name={missing} />}
        {lookup.status === 'done' && lookup.found.length > 0 && (
          <>
            <span className="sr-only">
              {lookup.found.length === 1 ? 'One match' : `${lookup.found.length} matches`}
            </span>
            <ul ref={resultsRef} className="flex flex-col gap-2">
              {lookup.found.map((facts) => (
                <li key={`${facts.kind}:${entityName(facts)}`}>
                  <button
                    type="button"
                    onClick={() => onPick(facts.kind, entityName(facts))}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <img
                      src={avatarOf(facts)}
                      alt=""
                      width={32}
                      height={32}
                      className={`size-8 shrink-0 bg-muted ${facts.kind === 'user' ? 'rounded-full' : 'rounded-md'}`}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{entityName(facts)}</span>
                      {facts.kind === 'repo' && (
                        <span className="text-muted-foreground"> · {facts.stars.toLocaleString('en-US')} ★</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABELS[facts.kind]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/** Nothing found: the page that fetches it from GitHub. */
function MissingNote({ name }: Readonly<{ name: string }>) {
  const repo = name.includes('/');
  const href = repo ? getRepoPath(name) : `/profile/${encodeURIComponent(name)}`;
  return (
    <p className="text-sm">
      GitRanks has nothing for “{name}” yet.{' '}
      <a href={href} className="font-medium text-link underline">
        Open its GitRanks page
      </a>{' '}
      to fetch it from GitHub, then come back.
    </p>
  );
}
