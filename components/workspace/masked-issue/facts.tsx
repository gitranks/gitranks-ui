import { Bug, Check, FileText, FlaskConical, Gauge, type LucideIcon, Sparkles, Wrench } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { RepoTierIcon } from '@/components/repo-tier-icon/repo-tier-icon';
import { tierStrongTextClass } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';
import {
  hintsShownOf,
  hintTextOf,
  ISSUE_KINDS,
  type IssueKind,
  issueKindOf,
  languageColorOf,
  projectTierNameOf,
  SIZE_WORDS,
} from '@/lib/workspace/masked-issue';
import type { IssueHint, MaskedIssue } from '@/lib/workspace/masked-issue.types';

const KIND_ICONS: Record<IssueKind, LucideIcon> = {
  bug: Bug,
  feature: Sparkles,
  docs: FileText,
  tests: FlaskConical,
  refactor: Wrench,
  performance: Gauge,
};

/** One fact in one shape: a quiet word, then its mark and its value. */
function Fact({ name, children }: { name: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" data-fact={name.toLowerCase()}>
      <span>{name}</span>
      <span className="inline-flex items-center gap-1 font-medium text-foreground">{children}</span>
    </span>
  );
}

/**
 * The line of facts of a masked issue, each a quiet word then its mark and value, 24 px apart: the language with its
 * colour dot, the size letter, the kind with its icon, and the project's rank tier with its glyph in the tier's colour.
 * A fact the issue does not have is left out.
 */
export function MaskedIssueFacts({
  issue,
  colors,
  className,
}: {
  issue: Pick<MaskedIssue, 'language' | 'size' | 'kind' | 'projectTier'>;
  /** The viewer's own language colours, by lower-case name, over GitHub's. */
  colors?: Readonly<Record<string, string>>;
  className?: string;
}) {
  const kind = issueKindOf(issue.kind);
  const KindIcon = kind ? KIND_ICONS[kind] : null;
  const tierName = projectTierNameOf(issue.projectTier);
  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground', className)}
      data-masked-facts=""
    >
      {issue.language ? (
        <Fact name="Language">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{ background: languageColorOf(issue.language, colors) }}
          />
          {issue.language}
        </Fact>
      ) : null}
      {issue.size ? (
        <Fact name="Size">
          <span title={SIZE_WORDS[issue.size]}>
            <span aria-hidden="true">{issue.size}</span>
            <span className="sr-only">{SIZE_WORDS[issue.size]}</span>
          </span>
        </Fact>
      ) : null}
      {kind && KindIcon ? (
        <Fact name="Kind">
          <KindIcon aria-hidden="true" className="size-3.5 shrink-0" />
          {ISSUE_KINDS[kind]}
        </Fact>
      ) : null}
      {issue.projectTier && tierName ? (
        <Fact name="Rank tier">
          <span className={cn('inline-flex', tierStrongTextClass(issue.projectTier))}>
            <RepoTierIcon tier={issue.projectTier} className="size-3.5" />
          </span>
          {tierName}
        </Fact>
      ) : null}
    </div>
  );
}

/** Up to two good signs, each with a small green check; nothing when there are none. */
export function IssueHints({ hints, extra = [] }: { hints: readonly IssueHint[]; extra?: string[] }) {
  const lines = [...hintsShownOf(hints).map(hintTextOf), ...extra];
  if (!lines.length) return null;
  return (
    <ul
      className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-xs text-muted-foreground"
      data-hints=""
    >
      {lines.map((line) => (
        <li key={line} className="inline-flex items-center gap-1 whitespace-nowrap">
          <Check aria-hidden="true" className="size-3 shrink-0 text-positive" />
          {line}
        </li>
      ))}
    </ul>
  );
}

/** The lesson an issue uses or teaches, when there is one. */
export type MaskedIssueLesson = {
  title: string;
  href?: Route | null;
  /** The person learned it already ("Uses"), or it is new for them ("Teaches"). */
  learned: boolean;
};

/** "Uses Find duplicates in one pass with a set, which you learned." */
export function LessonLine({ lesson }: { lesson: MaskedIssueLesson }) {
  const name = lesson.href ? (
    <Link href={lesson.href} prefetch={false} className="font-medium text-foreground hover:underline">
      {lesson.title}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{lesson.title}</span>
  );
  return (
    <span className="text-sm text-muted-foreground" data-lesson="">
      {lesson.learned ? 'Uses ' : 'Teaches '}
      {name}
      {lesson.learned ? ', which you learned.' : ', which is new for you.'}
    </span>
  );
}

/** The Enter key on the page's main button, as the boards draw it; not on a phone. */
export function EnterKey() {
  return (
    <span
      aria-hidden="true"
      className="ml-1 hidden h-5 items-center rounded border border-current px-1 font-mono text-[11px] opacity-70 sm:inline-flex"
    >
      ⏎
    </span>
  );
}
