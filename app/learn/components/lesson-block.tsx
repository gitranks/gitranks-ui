import type { ReactNode } from 'react';

import { CaseTable } from './case-table';
import { CodeExcerpt } from './code-excerpt';
import { CompareBlock } from './compare-block';
import { Diagram } from './diagram';
import { RichText } from './rich-text';
import { SequenceDiagram } from './sequence-diagram';
import { Counts, LINE_CLASSES } from '@/app/contribute/components/diff-viewer';
import type { PatchLineKind } from '@/lib/contribute/patch';
import type { LessonBlock as Block, LessonDiffLineKind } from '@/lib/learn/learn.types';
import { cn } from '@/lib/utils';

const DIFF_KINDS: Record<LessonDiffLineKind, PatchLineKind> = { HUNK: 'hunk', CTX: 'context', ADD: 'add', DEL: 'del' };

/** A hunk of the fix, as the review's diff draws it, the lines the step is about ringed. */
function DiffBlock({ block }: { block: Block }) {
  const lines = block.lines ?? [];
  const mark = new Set(block.mark ?? []);
  const added = lines.filter((line) => line.kind === 'ADD').length;
  const removed = lines.filter((line) => line.kind === 'DEL').length;
  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-block="diff">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/50 px-5 py-2.5 font-mono text-xs">
        <span className="min-w-0 font-medium break-all text-foreground">{block.file}</span>
        <Counts added={added} removed={removed} />
      </div>
      <div className="overflow-x-auto font-mono text-xs leading-relaxed">
        <div className="min-w-max">
          {lines.map((line, index) => (
            <div
              // Lines never move: the index is the line.
              key={index}
              data-line={line.kind}
              data-marked={mark.has(index) || undefined}
              className={cn(
                'px-5 whitespace-pre',
                LINE_CLASSES[DIFF_KINDS[line.kind] ?? 'context'],
                mark.has(index) && 'ring-1 ring-primary ring-inset',
              )}
            >
              {line.text || ' '}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A drawn block (a diagram, a before-and-after, a table) in a figure, its caption under it. */
function Figure({ kind, caption, children }: { kind: string; caption: string | null; children: ReactNode }) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2.5 rounded-lg border bg-muted/40 p-4" data-block={kind}>
      {children}
      {caption ? (
        <figcaption className="text-xs text-muted-foreground">
          <RichText text={caption} />
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * One block of a lesson's step, each type drawn by its own view: text, a diagram (boxes and arrows, or a call
 * sequence), a hunk of the fix, code, a before-and-after, or a table. A type this page does not know draws nothing, so
 * a page loaded before a new type ships skips it.
 */
export function LessonBlock({ block, id }: { block: Block; id: string }) {
  switch (block.type) {
    case 'TEXT':
      return block.text ? (
        <p className="max-w-prose text-foreground/90">
          <RichText text={block.text} />
        </p>
      ) : null;
    case 'DIAGRAM': {
      const label = block.caption ?? 'A diagram of this step';
      return (
        <Figure kind="diagram" caption={block.caption}>
          {block.layout === 'SEQUENCE' ? (
            <SequenceDiagram id={id} nodes={block.nodes} edges={block.edges} label={label} />
          ) : (
            <Diagram id={id} nodes={block.nodes} edges={block.edges} label={label} />
          )}
        </Figure>
      );
    }
    case 'DIFF':
      return <DiffBlock block={block} />;
    case 'CODE':
      return (
        <CodeExcerpt
          repo={block.repo}
          commit={block.commit}
          path={block.path}
          fromLine={block.fromLine}
          toLine={block.toLine}
          excerpt={block.excerpt}
        />
      );
    case 'COMPARE':
      return (
        <Figure kind="compare" caption={block.caption}>
          <CompareBlock block={block} id={id} label={block.caption ?? 'This step before and after the fix'} />
        </Figure>
      );
    case 'TABLE':
      return block.columns?.length && block.rows?.length ? (
        <Figure kind="table" caption={block.caption}>
          <CaseTable columns={block.columns} rows={block.rows} ring={block.ring} />
        </Figure>
      ) : null;
    default:
      return null;
  }
}
