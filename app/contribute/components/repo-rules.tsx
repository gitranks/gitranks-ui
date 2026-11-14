'use client';

import { ChevronDown, Lock } from 'lucide-react';
import Link from 'next/link';
import { createContext, type ReactNode, useContext } from 'react';

import { OpenOnHash } from './open-on-hash';
import { Panel, Pill } from './primitives';
import { OrgAccessLink } from './reply-text';
import type { ContributeRepoRules, ContributeRuleSource, ContributeSettings } from '@/lib/contribute/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import type { OrgAccess } from '@/lib/contribute/org-access';
import { httpsOnly } from '@/lib/contribute/pr-conventions';
import { type CapRow, capRowsOf, REPOS_ASK_LESS, RULES_NONE, RULES_NONE_REVIEW } from '@/lib/contribute/repo-rules';
import { cn } from '@/lib/utils';

const ASK_LINK = 'What repos can ask for';

/** Whether the rules start open: closed on the site; the design catalogue draws them open too. */
export const RulesOpen = createContext(false);

/** The repo rules' fold on a contribution's page: `#repo-rules` in the address opens it too. */
const FOLD_ID = 'repo-rules';

/** Opens the repo rules and brings them into view; false when the page has none. */
export function openRepoRules(doc: Pick<Document, 'getElementById'> = document): boolean {
  const fold = doc.getElementById(FOLD_ID) as HTMLDetailsElement | null;
  if (!fold) return false;
  fold.open = true;
  fold.scrollIntoView({ block: 'start' });
  return true;
}

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

const SUMMARY =
  'flex cursor-pointer list-none items-center gap-2 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden';

/** A rule in a line: its text opens the repo's own words when it quotes them; its source after it. */
function Rule({ line }: { line: ContributeRepoRules['lines'][number] }) {
  return (
    <li data-rule={line.kind} className="flex items-start gap-1">
      {line.quote ? (
        <details data-rule-quote="" className="group/quote min-w-0 flex-1">
          <summary className={cn(SUMMARY, 'items-start gap-1.5 max-sm:min-h-11 hover:text-foreground')}>
            <span
              aria-hidden="true"
              className="text-muted-foreground transition-transform group-open/quote:rotate-90 motion-reduce:transition-none"
            >
              ›
            </span>
            <span>{line.text}</span>
          </summary>
          <p className="mt-1 pl-3 break-words text-muted-foreground">“{line.quote}”</p>
        </details>
      ) : (
        <span className="min-w-0 flex-1">{line.text}</span>
      )}
      <RuleSource source={line.source} compact />
    </li>
  );
}

const Dot = () => <span aria-hidden="true">·</span>;

/** A part of the closed line, after a dot; nothing for a part that does not apply. */
const SummaryPart = ({ children }: { children: ReactNode }) =>
  children ? (
    <span className="flex items-center gap-2 text-muted-foreground">
      <Dot />
      {children}
    </span>
  ) : null;

/** A limit with its unit: `300 changed lines`, `1 file`. */
const capText = (cap: CapRow) =>
  cap.id === 'lines' ? `${cap.value} changed lines` : `${cap.value} ${cap.value === 1 ? 'file' : 'files'}`;

/** The limits the attempt runs under: the repo's with where it set them (and the user's setting now), or the user's. */
function Limits({ caps }: { caps: CapRow[] }) {
  return (
    <div data-repo-caps="" className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">Limits</span>
      <ul className="flex flex-col gap-1">
        {caps.map((cap) => (
          <li key={cap.id} data-cap={cap.id} className="flex flex-col">
            <span className="font-mono tabular-nums">{capText(cap)}</span>
            <span className="text-xs text-muted-foreground">
              {cap.source ? (
                <>
                  the repo&apos;s, from {cap.source}
                  {cap.yours !== null ? (
                    <>
                      {' '}
                      <Dot /> yours is <span className="font-mono tabular-nums">{cap.yours}</span>
                    </>
                  ) : null}
                </>
              ) : (
                'yours'
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** How GitHub lets GitRanks act in the repo, from what proves a restriction now. */
const ACCESS = {
  submit: { short: 'access blocked', line: 'act in its repositories' },
  replies: { short: 'replies blocked', line: 'reply in review threads' },
} as const;

function AccessFact({
  access,
  org,
  orgAccess,
  threadsBlocked,
}: {
  access: 'submit' | 'replies';
  org: string;
  orgAccess: OrgAccess;
  threadsBlocked: boolean;
}) {
  // The refusal GitRanks keeps for the organization: what it does about it, run after run.
  const kept = access === 'replies' && threadsBlocked;
  return (
    <div data-repo-access={access} data-threads-blocked={kept || undefined} className="flex items-start gap-2">
      <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="flex min-w-0 flex-col gap-1">
        {kept ? (
          <p>
            {org} blocks review-thread replies: GitRanks tries the first reply in its thread, then posts the rest as one
            comment.
          </p>
        ) : (
          <p>
            {org} only lets apps it approved {ACCESS[access].line}, and GitRanks isn&apos;t one yet.
          </p>
        )}
        <OrgAccessLink access={orgAccess} />
      </div>
    </div>
  );
}

/**
 * The repo's rules on a contribution's page, closed to one line ("Repo rules · 3 · 300 lines"): each rule with its
 * source, the repo's own words opened from the rule; the limits the attempt runs under, the repo's beside the user's
 * setting now (left out once the attempt is finished: the setting may have changed since); and how GitHub lets GitRanks
 * act in the repo, when a refusal proves it. A repo with no rules says so. Nothing while the API does not answer the
 * rules. `#repo-rules` in the address, and `openRepoRules`, open it.
 */
export function AttemptRepoRules({
  rules,
  settings,
  finished = false,
  access,
  threadsBlocked = false,
  org,
  orgAccess,
}: {
  rules: ContributeRepoRules | null | undefined;
  /** The user's own limits now, shown beside the repo's. */
  settings?: Pick<ContributeSettings, 'maxChangedLines' | 'maxFiles'> | null;
  /** The attempt is over: its limits are shown without the user's setting now. */
  finished?: boolean;
  /** What proves the organization keeps GitRanks out now: a refused submit, or refused replies. */
  access: 'submit' | 'replies' | null;
  /** The organization refuses review-thread replies, as GitRanks keeps it: the replies line says what GitRanks does. */
  threadsBlocked?: boolean;
  /** The organization, as the repo's owner: "driftwood-js", or "The organization". */
  org: string;
  /** Where the user asks the organization for access, read on the server. */
  orgAccess: OrgAccess;
}) {
  const open = useContext(RulesOpen);
  if (!rules) return null;
  const caps = rules.caps ? capRowsOf(rules.caps, finished ? null : settings) : [];
  const listed = rules.lines.length > 0;
  const repoCaps = caps.some(({ source }) => source);
  const kind = listed ? 'listed' : repoCaps ? 'caps' : 'none';
  // After the title: how many rules (or none), then the org's block when one is proven, else the changed lines' limit.
  const count = listed ? (
    <span className="font-mono tabular-nums">{rules.lines.length}</span>
  ) : kind === 'none' ? (
    'none'
  ) : null;
  const limit = access ? (
    <Pill tone="amber">{ACCESS[access].short}</Pill>
  ) : rules.caps ? (
    <>
      <span className="font-mono tabular-nums">{rules.caps.lines}</span> lines
    </>
  ) : null;

  return (
    <Panel aria-labelledby="repo-rules-title" className="[grid-area:rules] mt-5 lg:mt-4 gap-2 p-3 sm:p-3">
      <details id={FOLD_ID} data-repo-rules={kind} open={open || undefined} className="group text-sm">
        <summary className={cn(SUMMARY, 'min-h-11 sm:min-h-0')}>
          <span id="repo-rules-title" className="font-semibold">
            Repo rules
          </span>
          <SummaryPart>{count}</SummaryPart>
          <SummaryPart>{limit}</SummaryPart>
          <ChevronDown
            aria-hidden="true"
            className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {listed ? (
            <ul className="flex flex-col gap-2">
              {rules.lines.map((line, index) => (
                <Rule key={`${line.kind}-${index}`} line={line} />
              ))}
            </ul>
          ) : kind === 'none' ? (
            <>
              <p className="text-muted-foreground">
                {RULES_NONE} {RULES_NONE_REVIEW}
              </p>
              {caps.length ? (
                <p>
                  Your limits apply: <span className="font-mono tabular-nums">{caps[0].value}</span> changed lines,{' '}
                  <span className="font-mono tabular-nums">{caps[1].value}</span> files.
                </p>
              ) : null}
            </>
          ) : null}
          {kind !== 'none' && caps.length ? <Limits caps={caps} /> : null}
          {access ? (
            <AccessFact access={access} org={org} orgAccess={orgAccess} threadsBlocked={threadsBlocked} />
          ) : null}
          <AskLink />
        </div>
      </details>
      <OpenOnHash id={FOLD_ID} />
    </Panel>
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
