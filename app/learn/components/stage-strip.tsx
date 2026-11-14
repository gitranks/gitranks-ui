import { GitPullRequest, GraduationCap, Lock, type LucideIcon, Terminal } from 'lucide-react';

import { Pill } from '@/app/contribute/components/primitives';
import type { LearnStage } from '@/lib/learn/learn.types';
import { STAGES, type StageMark, stageMarksOf } from '@/lib/learn/lesson-format';
import { cn } from '@/lib/utils';

const ICONS: Record<(typeof STAGES)[number]['key'], LucideIcon> = {
  fix: Terminal,
  lesson: GraduationCap,
  approve: GitPullRequest,
};

function Mark({ mark }: { mark: StageMark }) {
  if (mark === 'done') return <Pill tone="green">Done</Pill>;
  if (mark === 'now') return <Pill tone="violet">Now</Pill>;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Lock aria-hidden="true" className="size-3.5 shrink-0" />
      Next
    </span>
  );
}

/**
 * Where the user is in a Learn attempt: the agent fixes the issue (in their terminal), they take the lesson, they
 * approve the pull request. On a phone only the stage they are at shows; up to `lg` the stages stack, since three
 * columns leave too little room for their lines. The lines wrap, never cut off. Nothing for an attempt that left the
 * flow.
 */
export function StageStrip({ stage }: { stage: LearnStage }) {
  const marks = stageMarksOf(stage);
  if (!marks) return null;
  return (
    <ol aria-label="Where you are" className="grid gap-2 lg:grid-cols-3">
      {STAGES.map((item, index) => {
        const Icon = ICONS[item.key];
        const now = marks[index] === 'now';
        // On a phone the current stage alone; once all are done, the last.
        const shownOnPhone = now || (!marks.includes('now') && index === STAGES.length - 1);
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
