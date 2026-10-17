import type { ReactNode } from 'react';

/**
 * Body of a ranking segment's not-found page. It renders inside the segment's layout, so the
 * heading and the selectors above it stay usable.
 */
export const EmptyRanking = ({ children }: Readonly<{ children: ReactNode }>) => (
  <div className="flex flex-col gap-2 py-10 text-center">
    <p className="text-lg font-semibold">No developers to show here</p>
    <p className="text-muted-foreground">{children}</p>
  </div>
);
