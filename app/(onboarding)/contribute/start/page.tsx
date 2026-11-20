import type { Metadata } from 'next';
import { Suspense } from 'react';

import { WorkStep } from '@/components/contribute/work-step';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { ContributeNoProfile, ContributeSettingUp } from '@/components/workspace/setting-up';
import { type WorkPicks, workPicksOf } from '@/lib/contribute/start-flow';
import { loadFlowProfileLanguages } from '@/lib/contribute/start-flow.data';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';

export const metadata: Metadata = { title: 'What you work on' };

/** Contribute's flow, step 1: what you work on. No account needed. */
export default function ContributeWorkPage({ searchParams }: PageProps<'/contribute/start'>) {
  return (
    <FlowFrame side="contribute" step={1}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeWork searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

/**
 * The picks the step starts from: a signed-in person's saved ones; with none saved, the address's, the languages
 * otherwise pre-ticked from their GitRanks profile; a visitor's, the address's.
 */
async function initialPicks(signedIn: boolean, address: WorkPicks): Promise<WorkPicks> {
  if (!signedIn) return address;
  const saved = (await loadContribute())?.contributor?.preferences;
  if (saved) return { languages: saved.languages, kinds: saved.kinds };
  return {
    languages: address.languages.length ? address.languages : await loadFlowProfileLanguages(),
    kinds: address.kinds,
  };
}

async function ContributeWork({ searchParams }: Pick<PageProps<'/contribute/start'>, 'searchParams'>) {
  const [params, { place, gate }] = await Promise.all([searchParams, loadContributeFlowPlace('work')]);
  const panel = flowPanelOf(place, { settingUp: <ContributeSettingUp />, noProfile: <ContributeNoProfile /> });
  const signedIn = gate.kind !== 'signed-out';
  return (
    <>
      {panel ?? (
        <>
          <FlowHead
            title="What do you work on?"
            text="Issues are picked for these. You can change them any time in Settings."
          />
          <WorkStep initial={await initialPicks(signedIn, workPicksOf(params))} signedIn={signedIn} />
        </>
      )}
      <FlowBookmark side="contribute" />
    </>
  );
}
