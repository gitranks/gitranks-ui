import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { LaunchBarSeen } from '@/components/launch-bar/launch-bar-dismiss';

export const metadata: Metadata = {
  title: 'Contribute',
  robots: { index: false, follow: false },
};

/** Contribute's own pages in the workspace: opening one ends Contribute's launch bar for this browser. */
export default function ContributeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LaunchBarSeen />
      {children}
    </>
  );
}
