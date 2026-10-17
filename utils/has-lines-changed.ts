/**
 * Whether a contribution row actually carries line counts.
 *
 * They can be missing rather than zero, and a missing count was never measured, so it is not a 0.
 * Rendering them unguarded prints a bare `+` and `-` with nothing between.
 *
 * Zero is a real answer and renders as `+0 -0`: a merged PR that changed nothing is not the same as a
 * PR whose diff we never asked for.
 */
export function hasLinesChanged(linesAdded?: number | null, linesRemoved?: number | null): boolean {
  return typeof linesAdded === 'number' && typeof linesRemoved === 'number';
}
