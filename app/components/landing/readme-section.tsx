'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { type FC, useMemo, useState, useSyncExternalStore } from 'react';

import { type ReadmeContent, readmeContent } from './readme-badges';
import type { ReadmeShowcase } from './readme-showcase';
import { useEntityFacts } from '@/app/badge/builder/[[...login]]/hooks/use-entity-facts';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import type { BadgeTile } from '@/badge/v3/tiles';
import type { EntityKind } from '@/badge/v3/types';
import { BadgeImages } from '@/components/badge-tiles/badge-tiles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { hasSessionHint } from '@/lib/session-hint';
import { cn } from '@/lib/utils';

const TABS: { kind: EntityKind; label: string; short?: string }[] = [
  { kind: 'user', label: 'Developer' },
  { kind: 'repo', label: 'Repository' },
  { kind: 'org', label: 'Organization', short: 'Org' },
];

const STEPS = [
  { title: 'Find yourself', text: 'Your login, or owner/repo for a project.' },
  { title: 'Pick a badge', text: 'Only the ones you have: rank, monthly race, next goal, contributors.' },
  { title: 'Copy and paste', text: 'Markdown or HTML. On GitHub it follows light and dark.' },
];

const noSubscription = () => () => {};

/**
 * Whether the browser says it holds a session (see `session-hint`), before the session itself is known. `false` on the
 * server and while hydrating, so the cached page and the first render match.
 */
const useSessionHint = () =>
  useSyncExternalStore(
    noSubscription,
    () => hasSessionHint(document.cookie),
    () => false,
  );

/** Shields a phone's README line shows. */
const PHONE_SHIELDS = 2;

/** Where the README sits on GitHub: a profile README, a repository's, or an organization's profile. */
const readmePath = ({ kind, name }: ReadmeContent) => {
  if (kind === 'org') return `.github / profile / README.md · ${name}`;
  const [owner, repo = owner] = name.split('/');
  return `README.md · ${owner} / ${repo}`;
};

const readmeTitle = ({ kind, name }: ReadmeContent) => (kind === 'repo' ? (name.split('/')[1] ?? name) : name);

/** A badge as it sits in a README: its image, linking to the builder. */
const ReadmeBadge: FC<{ tile: BadgeTile; action: string; className?: string }> = ({ tile, action, className }) => {
  const card = tile.format !== 'shield';

  return (
    <Link
      href={tile.href as Route}
      rel="nofollow"
      prefetch={false}
      title={action}
      className={cn(
        'max-w-full rounded-[3px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <BadgeImages
        tile={tile}
        className={card ? 'h-auto w-full' : 'h-5 w-auto max-w-full object-contain object-left'}
        style={card && tile.size ? { maxWidth: tile.size.width } : undefined}
      />
      <span className="sr-only"> – {action.toLowerCase()}</span>
    </Link>
  );
};

/** A GitHub README drawn in GitHub's palette, light or dark with the page, holding live badges. */
const ReadmeFrame: FC<{ content: ReadmeContent | 'loading'; own: boolean }> = ({ content, own }) => {
  const action = own ? 'Get the code' : 'Make this badge';

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[#d1d9e0] bg-white text-[#1f2328] dark:border-[#3d444d] dark:bg-[#0d1117] dark:text-[#f0f6fc]">
      <div className="flex items-center gap-2 border-b border-[#d1d9e0] px-3.5 py-2.5 text-xs text-[#59636e] dark:border-[#3d444d] dark:text-[#9198a1]">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" className="shrink-0">
          <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Z" />
        </svg>
        <span className="truncate sm:hidden">README.md</span>
        <span className="hidden truncate sm:inline" translate="no">
          {content === 'loading' ? 'README.md' : readmePath(content)}
        </span>
      </div>
      <div className="flex flex-col gap-3.5 p-3.5 sm:px-6 sm:py-5">
        {content === 'loading' ? (
          // The same rows as a developer's README, so the frame keeps its height whichever README comes.
          <div className="flex flex-col gap-3.5" aria-busy="true">
            <span className="sr-only">Loading your badges</span>
            <div className="hidden border-b border-[#d1d9e0b3] pb-2 sm:block dark:border-[#3d444db3]">
              <Skeleton className="h-8 w-40 bg-[#d1d9e0] dark:bg-[#3d444d]" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-36 bg-[#d1d9e0] dark:bg-[#3d444d]" />
              <Skeleton className="h-5 w-32 bg-[#d1d9e0] dark:bg-[#3d444d]" />
              <Skeleton className="hidden h-5 w-28 sm:block bg-[#d1d9e0] dark:bg-[#3d444d]" />
            </div>
            <Skeleton className="hidden h-[21px] w-64 sm:block bg-[#d1d9e0] dark:bg-[#3d444d]" />
            <Skeleton className="hidden aspect-[400/140] w-full max-w-[400px] sm:block bg-[#d1d9e0] dark:bg-[#3d444d]" />
          </div>
        ) : (
          <>
            <p
              className="hidden border-b border-[#d1d9e0b3] pb-2 text-2xl font-semibold sm:block dark:border-[#3d444db3]"
              translate="no"
            >
              {readmeTitle(content)}
            </p>
            <div className="flex flex-wrap gap-2">
              {content.shields.map((tile, index) => (
                <ReadmeBadge
                  key={tile.key}
                  tile={tile}
                  action={action}
                  className={index >= PHONE_SHIELDS ? 'hidden sm:inline-block' : 'inline-block'}
                />
              ))}
            </div>
            <p className="hidden text-sm leading-[21px] text-[#59636e] sm:block dark:text-[#9198a1]">
              Ranks from GitRanks, updated as they move.
            </p>
            {content.card && <ReadmeBadge tile={content.card} action={action} className="hidden sm:block" />}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * "Put your rank on your README": a README with live badges for a developer, a repository and an organization, the
 * builder's three steps, and the way into it. Everyone gets today's #1s from the cached page; a signed-in visitor's
 * Developer tab swaps in their own badges, read in the browser from the same public data the builder reads.
 */
export const ReadmeSection: FC<{ showcase: ReadmeShowcase }> = ({ showcase }) => {
  const { data: session, status } = useSession();
  const login = (status === 'authenticated' && session?.user?.githubLogin) || null;
  const own = useEntityFacts(login ? 'user' : null, login);
  const ownContent = useMemo(() => (own.status === 'found' ? readmeContent(own.facts, 'embed') : null), [own]);
  const [selected, setSelected] = useState<EntityKind>('user');

  const hinted = useSessionHint();

  // A visitor who looks signed in waits for their own badges rather than seeing the #1's first.
  const waiting = login ? own.status === 'loading' || own.status === 'idle' : status === 'loading' && hinted;
  let user: ReadmeContent | 'loading' | null = showcase.user;
  if (waiting) user = 'loading';
  else if (ownContent) user = ownContent;
  const contents: Record<EntityKind, ReadmeContent | 'loading' | null> = { ...showcase, user };

  const tabs = TABS.filter(({ kind }) => contents[kind]);
  const active = tabs.find(({ kind }) => kind === selected) ?? tabs[0];
  const content = active && contents[active.kind];

  const getHref = (login ? builderHref({ kind: 'user', name: login }) : builderHref({ kind: null })) as Route;

  return (
    <section aria-labelledby="badges" className="py-12 lg:py-20">
      <div
        className={cn(
          'grid gap-5 rounded-2xl border bg-card px-4 py-5 text-card-foreground shadow-sm sm:gap-6 sm:p-8',
          content && 'lg:grid-cols-[420px_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-8',
        )}
      >
        <div className="flex flex-col gap-1.5 lg:col-start-1">
          <span className="hidden text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:block">
            Badges
          </span>
          <h2 id="badges" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            Put your rank on your README
          </h2>
          <p className="text-muted-foreground sm:text-[15px]">
            Live badges for your profile, your project and your organization.
            <span className="hidden sm:inline"> They update as you climb.</span>
          </p>
        </div>

        {tabs.length > 1 && (
          <fieldset className="inline-flex w-fit gap-0.5 rounded-lg border bg-muted p-[3px] lg:col-start-1">
            <legend className="sr-only">Show a README for</legend>
            {tabs.map(({ kind, label, short }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={active?.kind === kind}
                aria-label={short ? label : undefined}
                onClick={() => setSelected(kind)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs transition-colors',
                  active?.kind === kind
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {short ? (
                  <>
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </>
                ) : (
                  label
                )}
              </button>
            ))}
          </fieldset>
        )}

        {content && (
          <div className="min-w-0 lg:col-start-2 lg:row-span-4 lg:row-start-1">
            <ReadmeFrame
              // A new entity's README is drawn afresh, so no image of the previous one shows while the new one loads.
              key={content === 'loading' ? 'loading' : `${content.kind}:${content.name}`}
              content={content}
              own={active.kind === 'user' && !!ownContent}
            />
          </div>
        )}

        <ol className="flex flex-col gap-2.5 sm:gap-3 lg:col-start-1">
          {STEPS.map(({ title, text }, index) => (
            <li key={title} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-2.5">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-soft-foreground"
              >
                {index + 1}
              </span>
              <div className="flex min-h-7 flex-col justify-center gap-0.5">
                <span className="text-sm font-semibold">{title}</span>
                <span className="hidden text-[13px] leading-[18px] text-muted-foreground sm:block">{text}</span>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-3.5 lg:col-start-1 lg:self-start">
          <Button asChild>
            <Link href={getHref} rel="nofollow" prefetch={false}>
              Get your badge
            </Link>
          </Button>
          <Link href="/badge/gallery" prefetch={false} className="text-center text-sm text-link underline">
            Badge gallery
          </Link>
        </div>
      </div>
    </section>
  );
};
