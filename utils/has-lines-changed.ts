/**
 * Whether a contribution row actually carries line counts.
 *
 * They can be missing rather than zero. When a profile is too heavy for GitHub to answer the full
 * contributions document, the crawler refetches it without `additions`/`deletions` and writes the row
 * with those fields left out, so an earlier full fetch's values are not overwritten with a 0 that was
 * never measured. Rendering them unguarded prints a bare `+` and `-` with nothing between.
 *
 * Zero is a real answer and renders as `+0 -0`: a merged PR that changed nothing is not the same as a
 * PR whose diff we never asked for.
 */
export function hasLinesChanged(linesAdded?: number | null, linesRemoved?: number | null): boolean {
  return typeof linesAdded === 'number' && typeof linesRemoved === 'number';
}
