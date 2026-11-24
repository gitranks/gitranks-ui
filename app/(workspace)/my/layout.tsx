import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { MyGate } from '@/components/workspace/my-gate';

/** The user's own pages: never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The workspace's pages under `/my`, behind the gate every page under `/my` has (`MyGate`). */
export default function MyLayout({ children }: { children: ReactNode }) {
  return <MyGate>{children}</MyGate>;
}
