import type { Metadata } from 'next';

import { AGENT_TITLE } from './copy';
import { StartStep } from './start-step';

export const metadata: Metadata = { title: AGENT_TITLE };

/** Contribute's flow, its first step: who does the work. No account needed to read it. */
export default function ContributeStartPage({ searchParams }: PageProps<'/contribute/start'>) {
  return <StartStep searchParams={searchParams} />;
}
