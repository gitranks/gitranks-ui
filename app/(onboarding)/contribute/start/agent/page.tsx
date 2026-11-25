import type { Metadata } from 'next';

import { AGENT_TITLE } from '../copy';
import { StartStep } from '../start-step';

export const metadata: Metadata = { title: AGENT_TITLE };

/** Contribute's flow, its first step again, at the address older links and the Agent tab name. */
export default function ContributeAgentPage({ searchParams }: PageProps<'/contribute/start/agent'>) {
  return <StartStep searchParams={searchParams} />;
}
