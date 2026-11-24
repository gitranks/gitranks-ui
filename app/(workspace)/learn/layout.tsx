import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Learn's own pages in the workspace; each sets whether it is indexed. */
export const metadata: Metadata = { title: 'Learn' };

export default function LearnLayout({ children }: { children: ReactNode }) {
  return children;
}
