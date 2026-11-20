import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BACK_TO_CHOICE, CONNECT_SIGN_IN, KEY_HEAD } from '../../copy';
import { ConnectScreen } from '@/components/workspace/agent/connect-view';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowBack, FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadContribute, loadProfileLanguages } from '@/lib/workspace/contribute.data';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: KEY_HEAD.title };

/** Contribute's flow, step 2 with a Claude key: the key's one screen, then the matching moment and the first issue. */
export default function ContributeKeyPage() {
  return (
    <FlowFrame side="contribute" step={2}>
      <FlowBack href={GETTING_IN_PATHS.contributeAgent}>{BACK_TO_CHOICE}</FlowBack>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeKey />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeKey() {
  const { place } = await loadContributeFlowPlace('agent-key');
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  let step = panel;
  if (!step && place.kind === 'sign-in') {
    step = (
      <>
        <FlowHead {...KEY_HEAD} />
        <FlowSignIn {...CONNECT_SIGN_IN} source="contribute_flow_sign_in" />
      </>
    );
  } else if (!step) {
    const [view, languages] = await Promise.all([loadContribute(), loadProfileLanguages()]);
    step = view ? (
      <ConnectScreen
        view={view}
        today={new Date().getUTCDate()}
        profileLanguages={languages}
        ownAgentHref={GETTING_IN_PATHS.contributeAgentOwn}
        eyebrow="About two minutes"
      />
    ) : null;
  }
  return (
    <>
      {step}
      <FlowBookmark side="contribute" />
    </>
  );
}
