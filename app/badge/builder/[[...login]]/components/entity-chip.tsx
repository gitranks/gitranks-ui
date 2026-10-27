'use client';

import type { MouseEvent } from 'react';

import { entityName } from '../utils/badge-options';
import type { EntityFacts } from '@/badge/v3/facts';

export const KIND_LABELS = { user: 'developer', org: 'organization', repo: 'repository' } as const;

/** The entity's avatar: its own, or the repository owner's. */
export function avatarOf(facts: EntityFacts): string {
  if (facts.kind !== 'repo' && facts.avatarUrl) return facts.avatarUrl;
  const owner = entityName(facts).split('/')[0];
  return `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?s=64`;
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
      <img src={avatarOf(facts)} alt="" width={24} height={24} className="size-6 shrink-0 rounded-full bg-muted" />
      <span className="min-w-0 truncate font-medium">{entityName(facts)}</span>
      <span className="text-muted-foreground">· {KIND_LABELS[facts.kind]}</span>
      <a href={changeHref} onClick={change} className="ml-1 font-medium text-link underline-offset-2 hover:underline">
        Change<span className="sr-only"> who the badge is for</span>
      </a>
    </div>
  );
}
