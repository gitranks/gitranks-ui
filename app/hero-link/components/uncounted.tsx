'use client';

import type { ReactNode } from 'react';

/** A link out to GitHub: the card's Star on GitHub. */
const GITHUB_LINK = 'a[href^="https://github.com/"]';

/**
 * Draws its children as they are, but a press of a link to GitHub inside them is not counted as a visitor's: the
 * press still opens GitHub, and the card's own counting never hears of it. For a maintainer's preview of the home card.
 */
export function Uncounted({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest(GITHUB_LINK)) event.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}
