import { Diagram } from './diagram';
import { Counts, LINE_CLASSES } from '@/app/contribute/components/diff-viewer';
import type { PatchLineKind } from '@/lib/contribute/patch';
import type { LessonBlock as Block, LessonDiffLineKind } from '@/lib/learn/learn.types';
import { codeSpansOf } from '@/lib/learn/question';
import { cn } from '@/lib/utils';

/** Plain text with `code` spans, as a lesson writes it: never HTML. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {codeSpansOf(text).map((part, index) =>
        part.code ? (
          // Parts never move: the index is the part.
          <code key={index} className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part.text}
          </code>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

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

/** Code the step quotes: its file and lines at the commit the lesson was written on, numbered. */
function CodeBlockView({ block }: { block: Block }) {
  const lines = (block.excerpt ?? '').split('\n');
  const from = block.fromLine ?? 1;
  const to = block.toLine ?? from + lines.length - 1;
  const href =
    block.repo && block.commit && block.path
      ? `https://github.com/${block.repo}/blob/${block.commit}/${block.path}#L${from}-L${to}`
      : null;
  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-block="code">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/50 px-5 py-2.5 font-mono text-xs">
        <span className="min-w-0 font-medium break-all text-foreground">{block.path}</span>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="whitespace-nowrap text-link hover:underline">
            lines {from}–{to} ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="whitespace-nowrap text-muted-foreground">
            lines {from}–{to}
          </span>
        )}
      </div>
      <div className="overflow-x-auto font-mono text-xs leading-relaxed">
        <div className="min-w-max py-1">
          {lines.map((line, index) => (
            // Lines never move: the index is the line.
            <div key={index} className="grid grid-cols-[3rem_auto] whitespace-pre text-foreground/90">
              <span aria-hidden="true" className="pe-3 text-end text-muted-foreground select-none">
                {from + index}
              </span>
              <span className="pe-5">{line || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One block of a lesson's step, each type drawn by its own view: text, a diagram, a hunk of the fix, or code. */
export function LessonBlock({ block, id }: { block: Block; id: string }) {
  switch (block.type) {
    case 'TEXT':
      return block.text ? (
        <p className="max-w-prose text-foreground/90">
          <RichText text={block.text} />
        </p>
      ) : null;
    case 'DIAGRAM':
      return (
        <figure className="m-0 flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-4" data-block="diagram">
          <Diagram id={id} nodes={block.nodes} edges={block.edges} label={block.caption ?? 'A diagram of this step'} />
          {block.caption ? (
            <figcaption className="text-xs text-muted-foreground">
              <RichText text={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case 'DIFF':
      return <DiffBlock block={block} />;
    case 'CODE':
      return <CodeBlockView block={block} />;
    default:
      return null;
  }
}
