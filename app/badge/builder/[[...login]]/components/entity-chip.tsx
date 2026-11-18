'use client';

import type { MouseEvent } from 'react';

import { entityName } from '../utils/badge-options';
import { entityLabel } from '../utils/builder-state';
import type { EntityFacts } from '@/badge/v3/facts';
import { REGISTRIES } from '@/lib/packages/registries';
import { cn } from '@/lib/utils';

const KIND_LABELS = {
  user: 'developer',
  org: 'organization',
  repo: 'repository',
} as const;

/** "developer", "repository", "npm package": what an entity is, a package with its registry. */
export const kindLabelOf = (facts: EntityFacts) =>
  facts.kind === 'package' ? `${REGISTRIES[facts.registry].label} package` : KIND_LABELS[facts.kind];

const githubAvatar = (owner: string) => `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?s=64`;

/**
 * The entity's avatar: its own, or the repository owner's; a package's is its repository's owner's, and it has none
 * without a repository.
 */
export function avatarOf(facts: EntityFacts): string | null {
  if (facts.kind === 'package') {
    const repository = facts.repo?.nameWithOwner ?? facts.repositoryName;
    return repository ? githubAvatar(repository.split('/')[0]) : null;
  }
  if (facts.kind !== 'repo' && facts.avatarUrl) return facts.avatarUrl;
  return githubAvatar(entityName(facts).split('/')[0]);
}

/** The entity's avatar, or a plain shape of the same size where it has none. */
export function EntityAvatar({
  facts,
  size,
  className,
}: Readonly<{ facts: EntityFacts; size: number; className: string }>) {
  const src = avatarOf(facts);
  if (!src) {
    return <span aria-hidden="true" className={cn('inline-block', className)} />;
  }
  return <img src={src} alt="" width={size} height={size} className={className} />;
}

/** Who the badge is for, with "Change" back to step 1. */
export function EntityChip({
  facts,
  changeHref,
  onChange,
}: Readonly<{ facts: EntityFacts; changeHref: string; onChange: () => void }>) {
  const change = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onChange();
  };
  return (
    <div className="flex w-fit max-w-full items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm">
      <EntityAvatar
        facts={facts}
        size={24}
        className={`size-6 shrink-0 ${facts.kind === 'package' ? 'rounded-md' : 'rounded-full'} bg-muted`}
      />
      <span className="min-w-0 truncate font-medium">{entityLabel(facts.kind, entityName(facts))}</span>
      <span className="text-muted-foreground">· {kindLabelOf(facts)}</span>
      <a href={changeHref} onClick={change} className="ml-1 font-medium text-link underline-offset-2 hover:underline">
        Change<span className="sr-only"> who the badge is for</span>
      </a>
    </div>
  );
}
