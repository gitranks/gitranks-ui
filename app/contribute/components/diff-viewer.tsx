import { type PatchFile, type PatchLineKind, parsePatch } from '@/lib/contribute/patch';
import { cn } from '@/lib/utils';

/** A file with more lines than this starts collapsed. */
export const LARGE_FILE_LINES = 120;

const LINE_CLASSES: Record<PatchLineKind, string> = {
  hunk: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  context: 'text-foreground/80',
  add: 'bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200',
  del: 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200',
  note: 'text-muted-foreground italic',
};

const STATUS_LABELS: Record<PatchFile['status'], string | null> = {
  modified: null,
  added: 'new',
  deleted: 'deleted',
  renamed: 'renamed',
};

function Counts({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="font-mono text-[13px] whitespace-nowrap">
      <span className="text-green-700 dark:text-green-400">+{added}</span>{' '}
      <span className="text-red-700 dark:text-red-400">−{removed}</span>
    </span>
  );
}

function FileDiff({ file }: { file: PatchFile }) {
  const large = file.lines.length > LARGE_FILE_LINES;
  const status = STATUS_LABELS[file.status];

  return (
    <details open={!large} data-file={file.path} data-large={large} className="group border-b last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2.5 bg-muted/50 px-5 py-2.5 font-mono text-[13px] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90">
            ›
          </span>
          <span className="min-w-0 font-medium break-all text-foreground">
            {file.from && file.from !== file.path ? `${file.from} → ${file.path}` : file.path}
          </span>
          {status ? <span className="font-sans text-xs text-muted-foreground">{status}</span> : null}
        </span>
        <span className="flex items-center gap-3">
          {large ? (
            <span className="font-sans text-xs text-muted-foreground group-open:hidden">
              {file.lines.length} lines, collapsed
            </span>
          ) : null}
          <Counts added={file.added} removed={file.removed} />
        </span>
      </summary>
      {file.binary ? (
        <p className="px-5 py-3 text-sm text-muted-foreground">A binary file: not shown.</p>
      ) : file.lines.length ? (
        <div className="overflow-x-auto font-mono text-[12.5px] leading-[1.65]">
          <div className="min-w-max">
            {file.lines.map((line, index) => (
              <div
                // Lines repeat within a file and never move: the index is the line.
                key={index}
                data-line={line.kind}
                className={cn('px-5 whitespace-pre', LINE_CLASSES[line.kind])}
              >
                {line.text || ' '}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-5 py-3 text-sm text-muted-foreground">No line changes (a mode change or an empty file).</p>
      )}
    </details>
  );
}

/** The patch, file by file, as text: never HTML, whatever it holds. */
export function DiffViewer({ patch }: { patch: string | null | undefined }) {
  const parsed = parsePatch(patch);

  return (
    <section aria-labelledby="diff-title" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b px-5 py-3.5">
        <h2 id="diff-title" className="text-base font-semibold">
          Diff
        </h2>
        {parsed.files.length ? (
          <span className="flex items-center gap-1.5">
            <Counts added={parsed.added} removed={parsed.removed} />
            <span className="font-mono text-[13px] text-muted-foreground">
              · {parsed.files.length} file{parsed.files.length === 1 ? '' : 's'}
            </span>
          </span>
        ) : null}
      </div>
      {parsed.files.length ? (
        parsed.files.map((file) => <FileDiff key={file.path} file={file} />)
      ) : (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {patch ? 'The patch has no file changes to show.' : 'The diff is not available yet.'}
        </p>
      )}
    </section>
  );
}
