import type { Metadata, Route } from 'next';
import { Suspense } from 'react';

import { BACK_TO_CHOICE, KEY_TITLE } from '../../copy';
import { ConnectScreen } from '@/components/workspace/agent/connect-view';
import { FlowBackHere } from '@/components/workspace/getting-in/flow-back-here';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadContribute, loadProfileLanguages } from '@/lib/workspace/contribute.data';
import { flowWayBackOf, withFlowWayBack } from '@/lib/workspace/flow-way-back';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: KEY_TITLE };

/** Contribute's flow, the first step's Claude key: the key's one screen, then the matching moment and the first issue. */
export default function ContributeKeyPage({ searchParams }: PageProps<'/contribute/start/agent/key'>) {
  return (
    <FlowFrame side="contribute" step={1}>
      <FlowBackHere href={GETTING_IN_PATHS.contributeStart}>{BACK_TO_CHOICE}</FlowBackHere>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeKey searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeKey({ searchParams }: Pick<PageProps<'/contribute/start/agent/key'>, 'searchParams'>) {
  const issue = flowWayBackOf(await searchParams);
  const { place } = await loadContributeFlowPlace('agent-key', { issue });
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  const [view, languages] = panel ? [null, []] : await Promise.all([loadContribute(), loadProfileLanguages()]);
  return (
    <>
      {panel ??
        (view ? (
          <ConnectScreen
            view={view}
            today={new Date().getUTCDate()}
            profileLanguages={languages}
            ownAgentHref={withFlowWayBack(GETTING_IN_PATHS.contributeAgentOwn, issue) as Route}
            eyebrow="About two minutes"
          />
        ) : null)}
      <FlowBookmark side="contribute" />
    </>
  );
}
