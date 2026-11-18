'use client';

import { Search } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';

import { fetchEntityFacts } from '../hooks/use-entity-facts';
import { entityName } from '../utils/badge-options';
import { entityLabel, packageNameOf, searchLookups } from '../utils/builder-state';
import { FORMAT_NAMES } from '../utils/builder-view';
import { EntityAvatar, KIND_LABELS } from './entity-chip';
import type { BadgeDefinition } from '@/badge/v3/catalogue';
import type { EntityFacts } from '@/badge/v3/facts';
import { formatCompact } from '@/badge/v3/format';
import type { EntityKind } from '@/badge/v3/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { packagePath } from '@/utils/package-paths';
import { getRepoPath } from '@/utils/repo-paths';

/** The words for a search of any kind once packages are shown: today's, with packages beside. */
type Scope = EntityKind | 'any' | 'any-with-packages';

const HEADINGS: Record<Scope, string> = {
  any: 'Who is the badge for?',
  'any-with-packages': 'Who is the badge for?',
  user: 'Which developer is the badge for?',
  org: 'Which organization is the badge for?',
  repo: 'Which repository is the badge for?',
  package: 'Which npm package is the badge for?',
};

const YOUR: Record<EntityKind, string> = {
  user: 'your GitHub account',
  org: 'your organization',
  repo: 'your repository',
  package: 'your npm package',
};

/** The step's heading; with a badge picked before the entity (in the gallery), it names that badge. */
export function findHeading(kind: EntityKind | null, badge: BadgeDefinition | null): string {
  if (kind && badge) return `Find ${YOUR[kind]} for the “${badge.title}” ${FORMAT_NAMES[badge.format]}`;
  return HEADINGS[kind ?? 'any'];
}

const LABELS: Record<Scope, string> = {
  any: 'A developer, an organization or a repository',
  'any-with-packages': 'A developer, an organization, a repository or an npm package',
  user: 'GitHub login',
  org: 'Organization login',
  repo: 'Repository',
  package: 'npm package',
};

const HINTS: Record<Scope, string> = {
  any: '“owner/name” finds a repository; a login finds a developer or an organization.',
  'any-with-packages':
    '“owner/name” finds a repository; a login finds a developer or an organization; a package’s name finds it on npm.',
  user: 'The developer’s GitHub login, for example torvalds.',
  org: 'The organization’s GitHub login, for example vercel.',
  repo: 'The repository as owner/name, for example react/react.',
  package: 'The package’s name on npm, for example react or @types/node.',
};

const PLACEHOLDERS: Record<Scope, string> = {
  any: 'torvalds, vercel or react/react',
  'any-with-packages': 'torvalds, vercel, react/react or @types/node',
  user: 'torvalds',
  org: 'vercel',
  repo: 'react/react',
  package: 'react or @types/node',
};

type Lookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; queryKind: EntityKind | null; found: EntityFacts[] }
  | { status: 'error' };

type FindStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  /** Narrows the search to one kind (`?repo=`, `?user=`, `?org=`, `?package=`). */
  kind: EntityKind | null;
  /** Packages are shown to the visitor: a search finds them too. */
  packages?: boolean;
  /** A badge picked before the entity (`?repo=&badge=…`), kept for the entity found here. */
  badge: BadgeDefinition | null;
  initialQuery: string;
  notice: string | null;
  onPick: (facts: EntityFacts) => void;
  onAnyKind: () => void;
};

const INVALID: Record<Scope, string> = {
  any: 'Enter a GitHub login or owner/name',
  'any-with-packages': 'Enter a GitHub login, owner/name or an npm package’s name',
  user: 'Enter a GitHub login',
  org: 'Enter an organization login',
  repo: 'Enter the repository as owner/name',
  package: 'Enter an npm package’s name',
};

/**
 * Step 1: one search box; a login finds developers and organizations, `owner/name` a repository, and, once packages
 * are shown to the visitor, a package's name an npm package.
 */
export function FindStep({
  headingRef,
  kind,
  packages = false,
  badge,
  initialQuery,
  notice,
  onPick,
  onAnyKind,
}: Readonly<FindStepProps>) {
  const scope: Scope = kind ?? (packages ? 'any-with-packages' : 'any');
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
    const lookups = searchLookups(query, kind, packages);
    if (!lookups.length) {
      inputRef.current?.setCustomValidity(INVALID[scope]);
      inputRef.current?.reportValidity();
      return;
    }
    setLookup({ status: 'loading' });
    // A developer, an organization and a package are asked apart: whichever answers is listed, even if another fails.
    const answers = await Promise.allSettled(lookups.map((each) => fetchEntityFacts(each.kind, each.name)));
    const found = answers.flatMap((answer) => (answer.status === 'fulfilled' && answer.value ? [answer.value] : []));
    const failed = answers.some((answer) => answer.status === 'rejected');
    // A miss leads to the page that fetches it from GitHub, or, for a search of a package alone, to the package's.
    const missed = lookups.find(({ kind: each }) => each !== 'package');
    const queryKind = missed ? kind : 'package';
    setLookup(
      found.length || !failed
        ? { status: 'done', query: (missed ?? lookups[0]).name, queryKind, found }
        : { status: 'error' },
    );
  };

  const missing = lookup.status === 'done' && !lookup.found.length ? lookup : null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {findHeading(kind, badge)}
      </h2>
      {kind && badge && (
        <p className="-mt-2 text-sm text-muted-foreground">Then style it and copy its code. Its style comes along.</p>
      )}

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
        {missing && <MissingNote name={missing.query} kind={missing.queryKind} />}
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
                    onClick={() => onPick(facts)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <EntityAvatar
                      facts={facts}
                      size={32}
                      className={`size-8 shrink-0 bg-muted ${facts.kind === 'user' ? 'rounded-full' : 'rounded-md'}`}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{entityLabel(facts.kind, entityName(facts))}</span>
                      {facts.kind === 'repo' && (
                        <span className="text-muted-foreground"> · {facts.stars.toLocaleString('en-US')} ★</span>
                      )}
                      {facts.kind === 'package' && facts.downloads && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {formatCompact(facts.downloads.lastWeek)} downloads a week
                        </span>
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

/**
 * Nothing found: the page that fetches it from GitHub, an organization's when the search is for organizations; for an
 * npm package (`npm/<name>`), its page, where a refresh reads it.
 */
export function missingHref(name: string, kind: EntityKind | null): string {
  if (kind === 'package') return packagePath(packageNameOf(name) ?? name.replace(/^npm\//, ''));
  if (name.includes('/')) return getRepoPath(name);
  return kind === 'org' ? `/org/${encodeURIComponent(name)}` : `/profile/${encodeURIComponent(name)}`;
}

function MissingNote({ name, kind }: Readonly<{ name: string; kind: EntityKind | null }>) {
  const href = missingHref(name, kind);
  const pkg = kind === 'package';
  return (
    <p className="text-sm">
      GitRanks has nothing for “{entityLabel(kind ?? 'user', name)}” yet.{' '}
      <a href={href} className="font-medium text-link underline">
        Open its GitRanks page
      </a>{' '}
      {pkg ? 'to read it from npm, then come back.' : 'to fetch it from GitHub, then come back.'}
    </p>
  );
}
