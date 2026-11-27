'use client';

import { ChevronDown, ExternalLink } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { CodeLine } from '@/components/workspace/blocks/code-lines';
import {
  type BuildFileCode,
  type DiffLine,
  type DiffRow,
  diffRowsOf,
  lineCountOf,
  moreRemovedWordsOf,
  tokensOfLine,
  unchangedWordsOf,
} from '@/lib/build/step-diff';
import { buildFileUrlOf, FILE_STATUS_WORDS, type StepFile } from '@/lib/build/step-page';
import { cn } from '@/lib/utils';
import type { CodeToken } from '@/lib/workspace/code-tokens';

/*
 * One changed file of a step, as a pull request shows it: its path, whether it is new or removed, how many lines it
 * added and removed, and its diff with the added and removed lines marked and the code highlighted. A run of lines
 * that did not change is one row, opened in place; so is the rest of a long run of removed lines. A file past the
 * first few shows its header and "Show the change". "Whole file" opens the file after the step beside the page.
 */

/** "+10 -1": only the counts that are not nothing. */
export function DiffCounts({ added, removed }: { added: number; removed: number }) {
  if (!added && !removed) return null;
  return (
    <span className="font-mono whitespace-nowrap" data-diff-counts="">
      {added ? <span className="text-positive-strong">+{added}</span> : null}
      {added && removed ? ' ' : null}
      {removed ? <span className="text-destructive">-{removed}</span> : null}
    </span>
  );
}

const ROW = 'grid grid-cols-[44px_20px_minmax(0,1fr)]';
const KIND_ROW: Record<DiffLine['kind'], string> = {
  context: '',
  added: 'bg-positive/13',
  removed: 'bg-destructive/11',
};
const MARK: Record<DiffLine['kind'], { sign: string; className: string }> = {
  context: { sign: '', className: '' },
  added: { sign: '+', className: 'text-positive-strong' },
  removed: { sign: '-', className: 'text-destructive' },
};

/** A line of code: its number, its mark (+, - or none), and its tokens. */
export function CodeRow({
  number,
  kind,
  tokens,
  sign = true,
}: {
  number: number | null;
  kind: DiffLine['kind'];
  tokens: readonly CodeToken[];
  /** Draw the + or -; the whole-file panel marks a line by its colour alone. */
  sign?: boolean;
}) {
  return (
    <div className={cn(ROW, KIND_ROW[kind])} data-diff-line={kind}>
      <span className="pr-2.5 text-right text-muted-foreground select-none">{number ?? ''}</span>
      <span className={cn('select-none', MARK[kind].className)} aria-hidden={!sign || kind === 'context'}>
        {sign ? MARK[kind].sign : ''}
      </span>
      <span className="pr-4 whitespace-pre">
        <CodeLine tokens={tokens} />
      </span>
    </div>
  );
}

/** A text's lines as plain code, for a file the highlighter left out. */
function plainLinesOf(text: string | null): CodeToken[][] | null {
  return text === null ? null : text.split(/\r?\n/).map((line) => (line ? [{ text: line }] : []));
}

const FOLD =
  'my-1 block w-full border-0 bg-muted/60 py-[3px] pr-0 pl-16 text-left font-sans text-xs text-muted-foreground select-none';

/** The rows of a file's diff, the folded runs opened in place. */
function DiffRows({
  rows,
  code,
  text,
}: {
  rows: readonly DiffRow[];
  code: BuildFileCode | null;
  /** The file's whole text after the step: the folded runs' lines when it has no highlighted code. */
  text: string | null;
}) {
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const open = (id: string) => setOpened((ids) => new Set(ids).add(id));
  const after = code?.after?.lines ?? plainLinesOf(text);
  return (
    <>
      {rows.map((row, index) => {
        if (row.kind === 'line') {
          return (
            <CodeRow
              // Rows never move: the index is the row.
              key={index}
              number={row.line.new}
              kind={row.line.kind}
              tokens={tokensOfLine(row.line, code)}
            />
          );
        }
        if (row.kind === 'more-removed') {
          if (opened.has(row.id)) {
            return row.lines.map((line) => (
              <CodeRow key={`${row.id}-${line.old}`} number={null} kind="removed" tokens={tokensOfLine(line, code)} />
            ));
          }
          return (
            <button key={row.id} type="button" className={cn(FOLD, 'hover:bg-accent')} onClick={() => open(row.id)}>
              {moreRemovedWordsOf(row.lines.length)}
            </button>
          );
        }
        const count = row.to - row.from + 1;
        // The lines come from the file after the step; without it (a removed file) the run is only named.
        if (!after) {
          return (
            <span key={row.id} className={FOLD}>
              {unchangedWordsOf(row.place, count)}
            </span>
          );
        }
        if (opened.has(row.id)) {
          return Array.from({ length: count }, (_, at) => {
            const number = row.from + at;
            return (
              <CodeRow key={`${row.id}-${number}`} number={number} kind="context" tokens={after[number - 1] ?? []} />
            );
          });
        }
        return (
          <button key={row.id} type="button" className={cn(FOLD, 'hover:bg-accent')} onClick={() => open(row.id)}>
            {unchangedWordsOf(row.place, count)}
          </button>
        );
      })}
    </>
  );
}

/** The lines of code in a box that scrolls sideways when a line is long. */
export function CodeLines({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-x-auto py-2 font-mono text-[13px] leading-[21px] [font-variant-ligatures:none]',
        className,
      )}
    >
      <div className="min-w-max">{children}</div>
    </div>
  );
}

export function StepFileBox({
  file,
  code,
  text,
  commit,
  open: openAtFirst,
  onWholeFile,
}: {
  file: StepFile;
  code: BuildFileCode | null;
  /** The whole file after the step; none for a removed file. */
  text: string | null;
  commit: string;
  /** Whether the diff shows at first; a folded file shows its header and "Show the change". */
  open: boolean;
  onWholeFile: () => void;
}) {
  const [open, setOpen] = useState(openAtFirst);
  const status = FILE_STATUS_WORDS[file.status];
  const kept = file.status !== 'removed' && text !== null;
  return (
    <figure
      className="m-0 flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card"
      data-build-file={file.path}
      data-build-file-status={file.status}
      data-build-file-open={open ? 'true' : 'false'}
    >
      <figcaption
        className={cn(
          'flex min-h-[37px] items-center justify-between gap-3 bg-muted/50 px-3 py-2 text-xs',
          open && 'border-b',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono font-semibold">{file.path}</span>
          {status ? (
            <span className="rounded-full border px-1.5 py-px text-[11px] font-medium whitespace-nowrap text-muted-foreground">
              {status}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <DiffCounts added={file.added} removed={file.removed} />
          {open ? (
            <>
              {kept ? (
                <button
                  type="button"
                  className="font-medium whitespace-nowrap text-link hover:underline"
                  onClick={onWholeFile}
                  data-build-whole-file=""
                >
                  Whole file
                </button>
              ) : null}
              {kept ? (
                <a
                  href={buildFileUrlOf(commit, file.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Open ${file.path} on GitHub`}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-link hover:underline"
              onClick={() => setOpen(true)}
              data-build-show-change=""
            >
              Show the change <ChevronDown className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      </figcaption>
      {open ? (
        <CodeLines>
          <DiffRows
            rows={diffRowsOf(file.hunks, text === null ? null : lineCountOf(text))}
            code={code}
            text={kept ? text : null}
          />
        </CodeLines>
      ) : null}
    </figure>
  );
}
