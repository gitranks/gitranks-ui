import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { FIRST_ISSUE, FIRST_ISSUE_SIGN_IN } from '../copy';
import { ContributeIssueList } from '@/app/(workspace)/contribute/components/issue-list';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { FlowBookmark, FlowExit } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadIssues } from '@/lib/contribute/contribute.data';
import { firstIssueLineOf } from '@/lib/contribute/start-flow';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { loadContribute, loadScheduleCounts } from '@/lib/workspace/contribute.data';
import { accessNoticesOf, claudeKeyOf, isSuspended } from '@/lib/workspace/contribute-state';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';
import { limitReachedOf } from '@/lib/workspace/limit-words';
import { MCP_CLIENT_NAMES } from '@/lib/workspace/mcp-setup';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { learnStartConnectionOf } from '@/lib/workspace/start/start-page';

export const metadata: Metadata = { title: 'Your first issue' };

/** Contribute's flow, step 3: the person's issues, Start on one. Start and Skip for now leave the flow. */
export default function ContributeFirstIssuePage() {
  return (
    <FlowFrame side="contribute" step={3}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeFirstIssue />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeFirstIssue() {
  const { place, gate } = await loadContributeFlowPlace('issue');
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  if (panel || place.kind === 'sign-in' || gate.kind !== 'open') {
    return (
      <>
        {panel ?? (
          <>
            <FlowHead title={FIRST_ISSUE.title} text={FIRST_ISSUE.visitorText} />
            <FlowSignIn {...FIRST_ISSUE_SIGN_IN} source="contribute_flow_sign_in" />
          </>
        )}
        <FlowBookmark side="contribute" />
      </>
    );
  }

  const view = await loadContribute();
  const held = isSuspended(view);
  const [page, counts] = await Promise.all([held ? Promise.resolve(null) : loadIssues({}), loadScheduleCounts()]);
  const settings = view?.contributor?.settings;
  const limit = held ? null : limitReachedOf(counts, settings, view?.contributor?.limits);
  const client = learnStartConnectionOf(view?.ownAgent?.tokens)?.client;
  const key = claudeKeyOf(view);
  const keyWaiting = key?.state === 'EXHAUSTED' || key?.state === 'LIMIT_REACHED' ? key.state : null;

  return (
    <>
      <FlowHead
        title={FIRST_ISSUE.title}
        text={firstIssueLineOf(gate.agents, client ? MCP_CLIENT_NAMES[client] : null)}
      />
      {view ? <ContributeNotices notices={accessNoticesOf(view).filter(({ kind }) => kind !== 'suspended')} /> : null}
      <FlowExit side="contribute">
        <ContributeIssueList
          page={page}
          agents={gate.agents}
          menu={false}
          held={held}
          limit={limit}
          languages={view?.contributor?.preferences?.languages ?? []}
          facts={{ capUsd: settings?.attemptCapUsd ?? null, keyWaiting }}
          source="contribute_flow_issue"
          noneTitle={FIRST_ISSUE.none}
        />
        <p className="text-sm text-muted-foreground">{FIRST_ISSUE.review}</p>
        <Link
          href={WORKSPACE_PATHS.contribute}
          prefetch={false}
          data-flow-leave=""
          className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
          {...contributeSource('contribute_flow_skip')}
        >
          {FIRST_ISSUE.skip}
        </Link>
      </FlowExit>
      <FlowBookmark side="contribute" />
    </>
  );
}
