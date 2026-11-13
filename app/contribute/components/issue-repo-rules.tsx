'use client';

import { useContext } from 'react';

import { RuleSource, RulesOpen } from './repo-rules';
import type { ContributeIssueRepoRules } from '@/lib/contribute/contribute.types';
import { RULES_NONE, rulesSummaryOf } from '@/lib/contribute/repo-rules';
import { cn } from '@/lib/utils';

/**
 * The issue card's rules: closed, one line ("This repo's rules · autopilot off · 2 more"), opening to each rule with
 * its source. A repo with none says so; nothing while the API does not answer the rules.
 */
export function IssueRepoRules({
  rules,
  className,
}: {
  rules: ContributeIssueRepoRules | null | undefined;
  className?: string;
}) {
  const open = useContext(RulesOpen);
  if (!rules) return null;
  if (!rules.lines.length) {
    return (
      <p data-repo-rules="none" className={cn('mt-1 text-sm text-muted-foreground', className)}>
        {RULES_NONE}
      </p>
    );
  }
  return (
    <details data-repo-rules="listed" open={open || undefined} className={cn('group mt-1', className)}>
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-1.5 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="transition-transform group-open:rotate-90 motion-reduce:transition-none">
          ›
        </span>
        <span className="font-medium text-foreground/80">This repo’s rules</span>
        {rulesSummaryOf(rules).map((part) => (
          <span key={part}>· {part}</span>
        ))}
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3 text-sm">
        {rules.lines.map((line, index) => (
          <li key={`${line.kind}-${index}`} data-rule={line.kind} className="flex flex-wrap items-baseline gap-x-2">
            <span>{line.text}</span>
            <RuleSource source={line.source} />
          </li>
        ))}
      </ul>
    </details>
  );
}
