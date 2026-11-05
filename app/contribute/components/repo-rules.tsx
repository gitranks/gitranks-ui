import Link from 'next/link';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ContributeRepoRules, ContributeRuleSource, ContributeSettings } from '@/lib/contribute/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { httpsOnly } from '@/lib/contribute/pr-conventions';
import { capRowsOf, REPOS_ASK_LESS, RULES_NONE, RULES_NONE_REVIEW } from '@/lib/contribute/repo-rules';
import { cn } from '@/lib/utils';

const ASK_LINK = 'What repos can ask for';

/**
 * Where a rule comes from, as a link to it (the file on GitHub, the maintainers page). The repo's own words for it, when
 * there are some, show on hover or focus. Nothing for a source we can't link.
 */
export function RuleSource({ source, quote }: { source: ContributeRuleSource | null; quote?: string | null }) {
  const href = source ? httpsOnly(source.url) : null;
  if (!source || !href) return null;
  const link = (
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
  if (!quote) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72 text-left" data-rule-quote="">
        “{quote}”
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * "This repo's rules" beside the sessions (variant A): each rule in a line with its source, the repo's words behind
 * the source, then the size limits the attempt runs under, the repo's beside the user's. A repo with no rules says
 * so. Nothing while the API does not answer the rules.
 */
export function AttemptRepoRules({
  rules,
  settings,
}: {
  rules: ContributeRepoRules | null | undefined;
  /** The user's own limits, shown beside the repo's. */
  settings?: Pick<ContributeSettings, 'maxChangedLines' | 'maxFiles'> | null;
}) {
  if (!rules) return null;
  const caps = rules.caps ? capRowsOf(rules.caps, settings) : [];
  const repoCaps = caps.filter(({ source }) => source);

  if (!rules.lines.length && !repoCaps.length) {
    return (
      <section
        data-repo-rules="none"
        aria-labelledby="repo-rules"
        className="flex flex-col gap-2.5 rounded-xl border bg-card p-4"
      >
        <h2 id="repo-rules" className="text-sm font-semibold">
          This repo’s rules
        </h2>
        <p className="text-sm text-muted-foreground">
          {RULES_NONE} {RULES_NONE_REVIEW}
        </p>
        {caps.length ? (
          <p className="text-sm">
            Your limits apply: <span className="font-mono tabular-nums">{caps[0].value}</span> changed lines,{' '}
            <span className="font-mono tabular-nums">{caps[1].value}</span> files.
          </p>
        ) : null}
        <AskLink />
      </section>
    );
  }

  return (
    <section
      data-repo-rules="listed"
      aria-labelledby="repo-rules"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="repo-rules" className="text-sm font-semibold">
          This repo’s rules
        </h2>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{rules.lines.length}</span>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        {rules.lines.map((line, index) => (
          <li key={`${line.kind}-${index}`} data-rule={line.kind} className="flex flex-col items-start gap-0.5">
            <span>{line.text}</span>
            <RuleSource source={line.source} quote={line.quote} />
          </li>
        ))}
      </ul>
      {caps.length ? (
        <div data-repo-caps="" className="flex flex-col gap-1.5 border-t pt-3 text-sm">
          <h3 className="text-xs font-normal text-muted-foreground">Limits for this contribution</h3>
          <ul className="flex flex-col gap-1.5">
            {caps.map((cap) => (
              <li key={cap.id} data-cap={cap.id} className="flex flex-col gap-0.5">
                <span>
                  {cap.label}: <span className="font-mono font-semibold tabular-nums">{cap.value}</span>{' '}
                  {cap.source ? '(repo)' : '(yours)'}
                  {cap.yours !== null ? (
                    <>
                      {' '}
                      · yours <span className="font-mono tabular-nums">{cap.yours}</span>
                    </>
                  ) : null}
                </span>
                {cap.source ? <span className="text-xs text-muted-foreground">{cap.source}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AskLink />
    </section>
  );
}

function AskLink() {
  return (
    <Link href={MAINTAINERS_PATH} prefetch={false} className="text-sm font-medium text-link hover:underline">
      {ASK_LINK} →
    </Link>
  );
}

/** Settings' line under the caps and autopilot: repos may ask for less, and what they can ask for. */
export function ReposAskLessNote({ className }: { className?: string }) {
  return (
    <p data-repo-rules-note="" className={cn('text-sm text-muted-foreground', className)}>
      {REPOS_ASK_LESS}{' '}
      <Link href={MAINTAINERS_PATH} prefetch={false} className="font-medium text-link hover:underline">
        {ASK_LINK}
      </Link>
    </p>
  );
}
