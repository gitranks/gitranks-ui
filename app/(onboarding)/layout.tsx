import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';

/** The steps are reached from the landings' one button; none is for search engines. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The flows that start Contribute and Learn: the site header (its Contribute or Learn marked by the path), no tabs and no
 * poll. Each step draws its own line of steps under it (`FlowFrame`).
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
