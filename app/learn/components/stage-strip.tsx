import { BookOpen, GitPullRequest, Lock, type LucideIcon, Terminal } from 'lucide-react';

import { Pill } from '@/components/pill/pill';
import type { PathMark } from '@/lib/learn/learn-home';
import { cn } from '@/lib/utils';

function Mark({ mark }: { mark: PathMark }) {
  if (mark === 'done') return <Pill tone="green">Done</Pill>;
  if (mark === 'now') return <Pill tone="violet">Now</Pill>;
  if (mark === 'working') return <Pill tone="violet">Working</Pill>;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Lock aria-hidden="true" className="size-3.5 shrink-0" />
      Next
    </span>
  );
}

/** One step of a strip: where it happens, what happens, its icon. */
export type StripStep = { key: string; where: string; title: string; Icon: LucideIcon };

/**
 * Steps in a row, each with its mark: done, the one now (or the agent working on it), or next. On a phone only the
 * step the user is at shows; up to `lg` the steps stack, since three columns leave too little room for their lines.
 * The lines wrap, never cut off.
 */
export function StepStrip({
  steps,
  marks,
  label,
}: {
  steps: readonly StripStep[];
  marks: readonly PathMark[];
  label?: string;
}) {
  const current = (mark: PathMark) => mark === 'now' || mark === 'working';
  return (
    <ol aria-label={label} className="grid gap-2 lg:grid-cols-3">
      {steps.map((item, index) => {
        const { Icon } = item;
        const now = current(marks[index]);
        // On a phone the current step alone; once all are done, the last.
        const shownOnPhone = now || (!marks.some(current) && index === steps.length - 1);
        return (
          <li
            key={item.key}
            data-stage={item.key}
            data-mark={marks[index]}
            aria-current={now ? 'step' : undefined}
            className={cn(
              'flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5',
              now && 'border-primary bg-brand-soft/40 ring-1 ring-primary',
              !shownOnPhone && 'max-sm:hidden',
            )}
          >
            <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-mono text-xs break-words text-muted-foreground">{item.where}</span>
              <span className="text-sm font-semibold break-words">{item.title}</span>
            </span>
            <span className="flex-none">
              <Mark mark={marks[index]} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The icons of Learn home's path: the goal, the agent's fix, the pass and the pull request. */
export const PATH_ICONS: Record<'goal' | 'agent' | 'pass', LucideIcon> = {
  goal: BookOpen,
  agent: Terminal,
  pass: GitPullRequest,
};
