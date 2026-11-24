'use client';

import Link from 'next/link';
import { createContext } from 'react';

import { cn } from '@/lib/utils';
import type { ContributeRuleSource } from '@/lib/workspace/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/workspace/paths';
import { httpsOnly } from '@/lib/workspace/pr-conventions';
import { REPOS_ASK_LESS } from '@/lib/workspace/repo-rules';

const ASK_LINK = 'What repos can ask for';

/** Whether the rules start open: closed on the site; the design catalogue draws them open too. */
export const RulesOpen = createContext(false);

/**
 * Where a rule comes from, as a link to it (the file on GitHub, the maintainers page); nothing for one we can't link.
 * `compact` draws the arrow alone, its label in its title and for screen readers.
 */
export function RuleSource({ source, compact = false }: { source: ContributeRuleSource | null; compact?: boolean }) {
  const href = source ? httpsOnly(source.url) : null;
  if (!source || !href) return null;
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={source.label}
        data-rule-source={source.label}
        className="shrink-0 rounded-sm px-1 text-link outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        ↗<span className="sr-only">{source.label}, opens in a new tab</span>
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-rule-source={source.label}
      className="text-xs break-all text-link hover:underline"
    >
      {source.label} ↗<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/**
 * The line under the caps and autopilot: repos may ask for less, and what they can ask for. `text`: the page's own
 * words for it (Settings' pull request limits).
 */
export function ReposAskLessNote({ className, text = REPOS_ASK_LESS }: { className?: string; text?: string }) {
  return (
    <p data-repo-rules-note="" className={cn('text-sm text-muted-foreground', className)}>
      {text}{' '}
      <Link href={MAINTAINERS_PATH} prefetch={false} className="font-medium text-link hover:underline">
        {ASK_LINK}
      </Link>
    </p>
  );
}
