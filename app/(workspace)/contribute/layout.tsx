import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Not "noindex" here: the landing at `/contribute` is indexed, and each page under it that is not says so itself.
 */
export const metadata: Metadata = { title: 'Contribute' };

/** Contribute's own pages in the workspace. */
export default function ContributeLayout({ children }: { children: ReactNode }) {
  return children;
}
