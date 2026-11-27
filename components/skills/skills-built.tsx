import { Check, Star } from 'lucide-react';
import Link from 'next/link';

import { SkillsLine } from './skills-line';
import { Button } from '@/components/ui/button';
import { type BuildCardMark, MARK_WORDS } from '@/lib/build/project-card';
import type { SkillsBuilt } from '@/lib/skills/skills.types';
import { builtLineOf, builtRowOf } from '@/lib/skills/skills-built';

/** A Built row's mark: gold ("Repeated after a week") in a warm colour with a star, the other in violet with a tick. */
function BuiltMark({ mark }: { mark: BuildCardMark }) {
  if (mark === 'gold') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning-soft-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--warning)_35%,transparent)]"
        data-built-mark="gold"
      >
        <Star className="size-3.5 shrink-0 fill-current text-warning" aria-hidden="true" />
        {MARK_WORDS.gold}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-brand-soft-foreground"
      data-built-mark={mark}
    >
      <Check className="size-4 shrink-0" aria-hidden="true" />
      {MARK_WORDS[mark]}
    </span>
  );
}

/**
 * One built project: its languages, steps and optional parts built; what was built and its one line; the marks; when
 * it was built; and the project's page.
 */
export function SkillsBuiltRow({ row, now }: { row: SkillsBuilt; now: Date }) {
  const words = builtRowOf(row, now);
  return (
    <article
      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
      data-skills-built={row.project}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {words.facts.length ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {words.facts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </span>
        ) : null}
        <Link href={words.href} prefetch={false} className="font-semibold text-pretty text-foreground hover:underline">
          {words.thing}
        </Link>
        {words.line ? <span className="text-sm text-muted-foreground">{words.line}</span> : null}
        {words.marks.length ? (
          <span className="flex flex-wrap items-center gap-2 pt-0.5">
            {words.marks.map((mark) => (
              <BuiltMark key={mark} mark={mark} />
            ))}
          </span>
        ) : null}
      </div>
      <div className="flex flex-none flex-wrap items-center gap-3">
        {words.built ? (
          <span className="rounded-full bg-positive/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-positive">
            {words.built}
          </span>
        ) : null}
        <Button asChild variant="outline" className="max-sm:min-h-11">
          <Link href={words.href} prefetch={false}>
            The project
          </Link>
        </Button>
      </div>
    </article>
  );
}

/**
 * "Built": the projects the person built with GitRanks Build, the one built last first, under the line that says how
 * they were made. Between the fixes and the courses. Nothing without a built project, heading included.
 */
export function SkillsBuiltSection({
  built,
  login,
  now,
}: {
  built: readonly SkillsBuilt[] | undefined;
  login: string;
  now: Date;
}) {
  if (!built?.length) return null;
  return (
    <section aria-labelledby="skills-built" className="flex flex-col gap-3" data-skills-built-section="">
      <div className="flex flex-col gap-1">
        <h3 id="skills-built" className="m-0 text-xl font-bold tracking-tight">
          Built
        </h3>
        <p className="m-0 text-sm text-muted-foreground">
          <SkillsLine parts={builtLineOf(login)} />
        </p>
      </div>
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {built.map((row) => (
          <li key={row.project}>
            <SkillsBuiltRow row={row} now={now} />
          </li>
        ))}
      </ul>
    </section>
  );
}
