import type { ReactNode } from 'react';

/**
 * An earlier attempt on the issue (the person discarded one and started again): the same page as the latest's, with a
 * line above it that leads to the latest.
 */
export default function EarlierPullRequestLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-6 pb-16">{children}</main>;
}
