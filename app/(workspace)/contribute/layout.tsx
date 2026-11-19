import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Contribute',
  robots: { index: false, follow: false },
};

/** Contribute's own pages in the workspace. */
export default function ContributeLayout({ children }: { children: ReactNode }) {
  return children;
}
