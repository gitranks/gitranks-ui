import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { HeaderLine } from '@/components/workspace/header-line';

/** The flows that start Contribute and Learn: the site header and its line, no tabs and no poll. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <HeaderLine />
      {children}
    </>
  );
}
