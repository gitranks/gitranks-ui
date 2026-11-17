export type FollowSlotProps = {
  /** The packages one press follows: one, or every package of a repository. */
  packages: { registry: 'npm'; name: string }[];
  /** "react-resize-detector", "@nebula/ui", or "nebula/ui packages". */
  label: string;
  placement: 'package-page' | 'used-by' | 'used-by-empty';
};

/**
 * Where following a package will be offered: on a package's page, in its left column above Refresh
 * (`package-page`); at the end of a repository's Used by tab (`used-by`); and beside "Package page" in that tab's empty
 * state (`used-by-empty`). Draws nothing yet.
 */
export function FollowSlot(_props: Readonly<FollowSlotProps>) {
  return null;
}
