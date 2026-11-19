import { LINE_CLASSES } from '@/app/contribute/components/diff-viewer';
import { cn } from '@/lib/utils';

/** Lines only in one side of a before-and-after: the before side's take the diff's removed tint, the after's its added. */
export type ExcerptChanges = { kind: 'del' | 'add'; lines: readonly boolean[] };

/**
 * Code a step quotes: its file and lines, numbered. With `repo` and `commit` its lines link to GitHub at that commit;
 * `changes` tints the lines only in this side of a before-and-after, as a diff's lines are.
 */
export function CodeExcerpt({
  repo,
  commit,
  path,
  fromLine,
  toLine,
  excerpt,
  changes,
}: {
  repo: string | null;
  commit: string | null;
  path: string | null;
  fromLine: number | null;
  toLine: number | null;
  excerpt: string | null;
  changes?: ExcerptChanges;
}) {
  const lines = (excerpt ?? '').split('\n');
  const from = fromLine ?? 1;
  const to = toLine ?? from + lines.length - 1;
  const href = repo && commit && path ? `https://github.com/${repo}/blob/${commit}/${path}#L${from}-L${to}` : null;
  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-block="code">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-muted/50 px-5 py-2.5 font-mono text-xs">
        <span className="min-w-0 font-medium break-all text-foreground">{path}</span>
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
          {lines.map((line, index) => {
            const changed = changes?.lines[index] ? changes.kind : null;
            return (
              // Lines never move: the index is the line.
              <div
                key={index}
                data-changed={changed ?? undefined}
                className={cn(
                  'grid grid-cols-[3rem_auto] whitespace-pre',
                  changed ? LINE_CLASSES[changed] : 'text-foreground/90',
                )}
              >
                <span aria-hidden="true" className="pe-3 text-end text-muted-foreground select-none">
                  {from + index}
                </span>
                <span className="pe-5">
                  {line || ' '}
                  {changed ? (
                    <span className="sr-only">
                      {changed === 'del' ? ' (removed by the fix)' : ' (added by the fix)'}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
