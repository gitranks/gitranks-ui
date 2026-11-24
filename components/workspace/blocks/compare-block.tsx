import type { ReactNode } from 'react';

import { CodeExcerpt } from './code-excerpt';
import { Diagram } from './diagram';
import type { LessonBlock as Block, LessonCompareSide } from '@/lib/workspace/blocks/block.types';
import type { DiagramOptions } from '@/lib/workspace/blocks/diagram-layout';
import { lineDiffOf } from '@/lib/workspace/blocks/line-diff';

const PANE_HEAD = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

/** A side's diagram is drawn narrower than a diagram of its own, at most two layers across, so it reads at half width. */
const SIDE_DIAGRAM: DiagramOptions = { width: 360, maxColumns: 2 };

const linesOf = (side: LessonCompareSide | null) => (side?.excerpt ?? '').split('\n');

function Pane({ side, name, children }: { side: 'before' | 'after'; name: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-compare-side={side}>
      <span className={PANE_HEAD}>{name}</span>
      {children}
    </div>
  );
}

/**
 * A before-and-after: two small diagrams, or two code excerpts, side by side from the `sm` width and stacked on a
 * phone. In diagrams the tones mark the change (WARN broken, ACCENT what the fix changed); in code the lines only in one
 * side are tinted as a diff's are. The before side's code is the file at the lesson's commit and links to it; the after
 * side's is the same file after the fix, which has no commit to link to.
 */
export function CompareBlock({ block, id, label }: { block: Block; id: string; label: string }) {
  const { before, after } = block;
  if (!before && !after) return null;
  let sides: [ReactNode, ReactNode];
  if (block.compareOf === 'CODE') {
    const { removed, added } = lineDiffOf(linesOf(before), linesOf(after));
    sides = [
      <CodeExcerpt
        key="before"
        repo={block.repo}
        commit={block.commit}
        path={before?.path ?? null}
        fromLine={before?.fromLine ?? null}
        toLine={before?.toLine ?? null}
        excerpt={before?.excerpt ?? null}
        changes={{ kind: 'del', lines: removed }}
      />,
      <CodeExcerpt
        key="after"
        repo={null}
        commit={null}
        path={after?.path ?? null}
        fromLine={after?.fromLine ?? null}
        toLine={after?.toLine ?? null}
        excerpt={after?.excerpt ?? null}
        changes={{ kind: 'add', lines: added }}
      />,
    ];
  } else if (block.compareOf === 'DIAGRAM') {
    sides = [
      <Diagram
        key="before"
        id={`${id}-before`}
        nodes={before?.nodes}
        edges={before?.edges}
        label={`Before: ${label}`}
        options={SIDE_DIAGRAM}
      />,
      <Diagram
        key="after"
        id={`${id}-after`}
        nodes={after?.nodes}
        edges={after?.edges}
        label={`After: ${label}`}
        options={SIDE_DIAGRAM}
      />,
    ];
  } else {
    return null;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-compare={block.compareOf}>
      <Pane side="before" name="Before">
        {sides[0]}
      </Pane>
      <Pane side="after" name="After">
        {sides[1]}
      </Pane>
    </div>
  );
}
