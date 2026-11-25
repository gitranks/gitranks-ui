import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { FIRST_ISSUE } from '../copy';
import { FirstIssueList } from '../first-issue-list';
import { StillRanking } from '@/app/contribute/components/still-ranking';
import { FirstIssueStep } from '@/components/contribute/start/first-issue-step';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { MaskedIssueRow } from '@/components/workspace/masked-issue/masked-issue-row';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { HEADING } from '@/components/workspace/primitives';
import { loadIssues } from '@/lib/contribute/contribute.data';
import { type FirstIssueState, firstIssueLineOf } from '@/lib/contribute/start-flow';
import { loadFlowProfileLanguages } from '@/lib/contribute/start-flow.data';
import { startWaysOf, startWaysReadOf } from '@/lib/contribute/start-ways';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { loadContribute, loadScheduleCounts } from '@/lib/workspace/contribute.data';
import type { ContributeIssuePage } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isSuspended } from '@/lib/workspace/contribute-state';
import { flowWayBackOf } from '@/lib/workspace/flow-way-back';
import { hasContributeSign } from '@/lib/workspace/gate';
import { loadContributeFlowPlace, loadOpenedIssue } from '@/lib/workspace/getting-in.data';
import { limitReachedOf } from '@/lib/workspace/limit-words';
import { issuePageHrefOf } from '@/lib/workspace/masked-issue';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';
import { MCP_CLIENT_NAMES } from '@/lib/workspace/mcp-setup';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { learnStartConnectionOf } from '@/lib/workspace/start/start-page';

export const metadata: Metadata = { title: 'Your first issue' };

/**
 * Contribute's flow, its second step: the person's issues, with the languages they are picked for. Opening it sets the
 * Contribute sign (from the browser, once drawn). "See the full issue", "Start fixing it" and "Skip for now" leave the
 * flow.
 */
export default function ContributeFirstIssuePage({ searchParams }: PageProps<'/contribute/start/issue'>) {
  return (
    <Suspense
      fallback={
        <FlowFrame side="contribute" step={2}>
          <ContributePageSkeleton />
        </FlowFrame>
      }
    >
      <ContributeFirstIssue searchParams={searchParams} />
    </Suspense>
  );
}

/** What the list holds, as the head's sentence tells it: an account held or at its limit reads as a list. */
function listStateOf(page: ContributeIssuePage | null | undefined, held: boolean): FirstIssueState {
  if (held || !page || page.items.length) return 'list';
  if (!page.computedAt) return 'picking';
  return page.next ? 'list' : 'none';
}

async function ContributeFirstIssue({ searchParams }: Pick<PageProps<'/contribute/start/issue'>, 'searchParams'>) {
  const issue = flowWayBackOf(await searchParams);
  const { place, gate, facts } = await loadContributeFlowPlace('issue', { issue });
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  if (panel || gate.kind !== 'open') {
    return (
      <FlowFrame side="contribute" step={2}>
        {panel}
        <FlowBookmark side="contribute" />
      </FlowFrame>
    );
  }

  const view = await loadContribute();
  const held = isSuspended(view);
  const saved = view?.contributor?.preferences?.languages;
  const [page, counts, masked, opened, profile] = await Promise.all([
    held ? Promise.resolve(null) : loadIssues({}),
    loadScheduleCounts(),
    loadMaskedListReads(),
    loadOpenedIssue(issue),
    saved?.length ? Promise.resolve([]) : loadFlowProfileLanguages(),
  ]);
  const settings = view?.contributor?.settings;
  const limit = held ? null : limitReachedOf(counts, settings, view?.contributor?.limits);
  const client = learnStartConnectionOf(view?.ownAgent?.tokens)?.client;
  const key = claudeKeyOf(view);
  const keyWaiting = key?.state === 'EXHAUSTED' || key?.state === 'LIMIT_REACHED' ? key.state : null;
  const state = listStateOf(page, held);
  const read = startWaysReadOf({ gate, view, attempt: facts.hasAttempt, issue, issueReads: !!opened });

  return (
    <FirstIssueStep
      mark={!hasContributeSign(gate)}
      head={{
        title: FIRST_ISSUE.title,
        text: firstIssueLineOf(facts.connected, client ? MCP_CLIENT_NAMES[client] : null, state),
      }}
      languages={{
        saved: saved?.length ? saved : null,
        profile,
        preferences: view?.contributor?.preferences ?? null,
      }}
      nothingConnected={startWaysOf({ ...read, own: null, key: 'none', sign: false })}
      picking={<StillRanking />}
      opened={
        opened?.masked ? (
          <section className="flex flex-col gap-3" data-opened-issue="">
            <h2 className={HEADING.section}>{FIRST_ISSUE.opened}</h2>
            <MaskedIssueRow
              issue={opened.masked}
              state={opened.state === 'FULL' && opened.full ? 'full' : 'masked'}
              full={opened.full}
              href={issuePageHrefOf(opened.masked.id, 'contribute')}
              seeLabel={FIRST_ISSUE.openedStart}
              skippable={false}
            />
            <h2 className={HEADING.section}>{FIRST_ISSUE.another}</h2>
          </section>
        ) : null
      }
      foot={
        <>
          <p className="m-0 text-sm text-muted-foreground">{FIRST_ISSUE.next}</p>
          <Link
            href={WORKSPACE_PATHS.contribute}
            prefetch={false}
            data-flow-leave=""
            className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
            {...contributeSource('contribute_flow_skip')}
          >
            {FIRST_ISSUE.skip}
          </Link>
        </>
      }
    >
      <FirstIssueList
        none={state === 'none'}
        page={page}
        agents={gate.agents}
        menu={false}
        held={held}
        limit={limit}
        languages={saved ?? []}
        facts={{ capUsd: settings?.attemptCapUsd ?? null, keyWaiting }}
        source="contribute_flow_issue"
        masked={masked}
      />
    </FirstIssueStep>
  );
}
