import { type PatchFile, type PatchLineKind, parsePatch } from '@/lib/contribute/patch';
import { cn } from '@/lib/utils';

/** A file with more lines than this starts collapsed. */
export const LARGE_FILE_LINES = 120;

const LINE_CLASSES: Record<PatchLineKind, string> = {
  hunk: 'bg-brand-soft text-brand-soft-foreground',
  context: 'text-foreground/80',
  add: 'bg-positive/10 text-foreground',
  del: 'bg-negative/10 text-foreground',
  note: 'text-muted-foreground italic',
  commit: 'border-y bg-muted/60 font-sans text-xs font-medium text-muted-foreground',
};

const STATUS_LABELS: Record<PatchFile['status'], string | null> = {
  modified: null,
  added: 'new',
  deleted: 'deleted',
  renamed: 'renamed',
};

function Counts({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="font-mono text-xs whitespace-nowrap">
      <span className="text-positive">+{added}</span> <span className="text-negative">−{removed}</span>
    </span>
  );
}

/** At most this many lines are shown for one file, and for the whole patch. */
export const MAX_FILE_LINES = 2_000;
export const MAX_TOTAL_LINES = 10_000;

const CUT_NOTE = 'The rest is not shown here. Read it all on GitHub once the pull request is open.';

function FileDiff({ file, room }: { file: PatchFile; room: number }) {
  const large = file.lines.length > LARGE_FILE_LINES;
  const status = STATUS_LABELS[file.status];
  const shown = file.lines.slice(0, Math.max(0, Math.min(room, MAX_FILE_LINES)));
  const cut = shown.length < file.lines.length;

  return (
    <details
      open={!large}
      data-file={file.path}
      data-large={large}
      data-truncated={cut}
      className="group border-b last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2.5 bg-muted/50 px-5 py-2.5 font-mono text-xs [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-90">
            ›
          </span>
          <span className="min-w-0 font-medium break-all text-foreground">
            {file.from && file.from !== file.path ? `${file.from} → ${file.path}` : file.path}
          </span>
          {status ? <span className="font-sans text-xs text-muted-foreground">{status}</span> : null}
          {file.binary ? <span className="font-sans text-xs text-muted-foreground">binary</span> : null}
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
      {shown.length ? (
        <div className="overflow-x-auto font-mono text-xs leading-relaxed">
          <div className="min-w-max">
            {shown.map((line, index) => (
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
      ) : null}
      {cut ? (
        <p data-cut className="px-5 py-3 text-sm text-muted-foreground">
          {shown.length
            ? `Showing ${shown.length.toLocaleString('en-US')} of ${file.lines.length.toLocaleString('en-US')} lines. `
            : `${file.lines.length.toLocaleString('en-US')} lines, past the most shown for one patch. `}
          {CUT_NOTE}
        </p>
      ) : null}
      {file.binary ? (
        <p className="px-5 py-3 text-sm text-muted-foreground">A binary file: its content is not shown.</p>
      ) : null}
      {!file.lines.length && !file.binary ? (
        <p className="px-5 py-3 text-sm text-muted-foreground">No line changes (a mode change or an empty file).</p>
      ) : null}
    </details>
  );
}

/** The patch, file by file, as text: never HTML, whatever it holds. Long files and patches are cut, and say so. */
export function DiffViewer({ patch, title = 'Diff' }: { patch: string | null | undefined; title?: string }) {
  const parsed = parsePatch(patch);
  let room = MAX_TOTAL_LINES;
  const files = parsed.files.map((file) => {
    const fileRoom = room;
    room -= Math.min(file.lines.length, MAX_FILE_LINES, Math.max(0, fileRoom));
    return { file, room: fileRoom };
  });

  return (
    <section aria-labelledby="diff-title" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b px-5 py-3.5">
        <h2 id="diff-title" className="text-base font-semibold">
          {title}
        </h2>
        {parsed.files.length ? (
          <span className="flex items-center gap-1.5">
            <Counts added={parsed.added} removed={parsed.removed} />
            <span className="font-mono text-xs text-muted-foreground">
              · {parsed.files.length} file{parsed.files.length === 1 ? '' : 's'}
            </span>
          </span>
        ) : null}
      </div>
      {files.length ? (
        files.map(({ file, room: fileRoom }) => <FileDiff key={file.path} file={file} room={fileRoom} />)
      ) : (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {patch ? 'The patch has no file changes to show.' : 'The diff is not available yet.'}
        </p>
      )}
    </section>
  );
}
