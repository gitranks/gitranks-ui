import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ContributeNav } from './components/contribute-nav';
import { Header } from '@/components/header/header';

export const metadata: Metadata = {
  title: 'Contribute',
  robots: { index: false, follow: false },
};

/**
 * GitRanks Contribute. Open only to signed-in users the API lets in: the proxy answers everyone else with a 404, and
 * each page checks again when it reads the user's data.
 */
export default function ContributeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <ContributeNav />
      {children}
    </>
  );
}
