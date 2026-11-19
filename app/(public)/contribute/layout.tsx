import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { HeaderLine } from '@/components/workspace/header-line';

export const metadata: Metadata = {
  title: 'Contribute',
  robots: { index: false, follow: false },
};

/**
 * The pages about Contribute, open to visitors (for maintainers, the ledger, the MCP docs, the questions, the agent
 * sign-in's consent page): the site header and its line, no tabs.
 */
export default function ContributePublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header section="contribute" />
      <HeaderLine />
      {children}
    </>
  );
}
