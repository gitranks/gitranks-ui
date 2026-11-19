import { Cpu, KeyRound, Wallet } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ComingSoon } from './coming-soon';
import { HostedAgentControl } from './hosted-agent-control';
import { Pill } from '@/components/pill/pill';
import { buttonVariants } from '@/components/ui/button';
import { ClosedGroupLine } from '@/components/workspace/closed-group-line';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { HEADING } from '@/components/workspace/primitives';
import { ReposAskLessNote } from '@/components/workspace/pull-request/repo-rules';
import { SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { cn } from '@/lib/utils';
import type { ContributeComingSoonProvider, ContributeView } from '@/lib/workspace/contribute.types';
import type { ContributeNotice } from '@/lib/workspace/contribute-state';
import { claudeKeyOf, settingsOf } from '@/lib/workspace/contribute-state';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { budgetSummaryOf, keySummaryOf, modelSummaryOf } from '@/lib/workspace/settings-summary';

/** This cycle's spend against its cap: a thin bar under the Budget row's line. */
function SpendBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span className="mt-1.5 block h-1.5 overflow-hidden rounded bg-muted">
      <meter className="sr-only" aria-label="Spent this cycle" min={0} max={max} value={value} />
      <span aria-hidden="true" className="block h-full rounded bg-primary" style={{ width: `${percent}%` }} />
    </span>
  );
}

/** What the hosted agent is, for someone without a key: where it runs, what it costs, and the way to start it. */
export function HostedAgentPitch() {
  return (
    <div className="flex flex-col gap-4" data-hosted="pitch">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <h3 className={HEADING.block}>Where it runs</h3>
          <p className="text-sm text-muted-foreground">
            In Anthropic&apos;s hosted sandbox, on your Claude API key. It picks issues and works while your computer is
            off, and brings you each change to review.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className={HEADING.block}>What it costs</h3>
          <p className="text-sm text-muted-foreground">
            Your plan&apos;s API credits, under the budget you set: a cap a cycle, pacing, and a cap on each attempt. We
            charge nothing.
          </p>
        </div>
      </div>
      <Link
        href={WORKSPACE_PATHS.agentKey}
        prefetch={false}
        className={cn(buttonVariants({ variant: 'outline' }), 'min-h-10 self-start px-4 font-semibold')}
      >
        Use a Claude key
      </Link>
    </div>
  );
}

/** The block's head: "Hosted agent", and that it works for Contribute alone. */
function Head() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h2 id="hosted-agent-title" className={HEADING.section}>
        Hosted agent
      </h2>
      <Pill tone="neutral">Contribute only</Pill>
    </div>
  );
}

function Block({ children, state }: { children: ReactNode; state: string }) {
  return (
    <section
      id="hosted-agent"
      aria-labelledby="hosted-agent-title"
      className="flex scroll-mt-20 flex-col gap-3"
      data-hosted={state}
    >
      {children}
    </section>
  );
}

/**
 * The Agent tab's "Hosted agent" (W1 §9.2, §9.4). With a Claude key: the key's trouble first, the control slot
 * (`HostedAgentControl`), the key, model and budget rows, what repos can turn off, and what is coming. Without one: its
 * pitch for a contributor, or one closed line for a learner, which opens the pitch in place.
 */
export function HostedAgentBlock({
  view,
  learner,
  notices,
  noted,
  now,
}: {
  view: ContributeView;
  /** Uses Learn alone: the block is one closed line. */
  learner: boolean;
  /** The key's notices: refused, out of credits, at its limit. */
  notices: ContributeNotice[];
  /** The providers the user asked to hear about. */
  noted: readonly ContributeComingSoonProvider[];
  now?: Date;
}) {
  const key = claudeKeyOf(view);
  const comingSoon = (
    <ComingSoon viewer="signed-in" noted={noted} variant="compact" title="Coming soon for the hosted agent:" />
  );

  if (!key) {
    if (learner) {
      return (
        <ClosedGroupLine
          id="hosted-agent"
          title="Hosted agent"
          text="· for Contribute · not set up."
          link={{ href: WORKSPACE_PATHS.agentKey, label: 'What it is' }}
        >
          <HostedAgentPitch />
        </ClosedGroupLine>
      );
    }
    return (
      <Block state="pitch">
        <Head />
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <HostedAgentPitch />
        </div>
        {comingSoon}
      </Block>
    );
  }

  const { contributor } = view;
  const settings = settingsOf(view);
  const spend = contributor?.spend;
  return (
    <Block state="set-up">
      <Head />
      <ContributeNotices notices={notices} />
      <HostedAgentControl view={view} now={now} />
      <SettingsList>
        <SettingsRow
          icon={KeyRound}
          href={WORKSPACE_PATHS.agentKey}
          cta="Edit"
          title="Claude API key"
          value={keySummaryOf(key)}
          data={{ 'data-key-state': key.state }}
        />
        <SettingsRow
          icon={Cpu}
          href={WORKSPACE_PATHS.agentModel}
          cta="Edit"
          title="Model and effort"
          value={settings ? modelSummaryOf(settings) : 'They start from your plan, and are yours to change.'}
        />
        <SettingsRow
          icon={Wallet}
          href={WORKSPACE_PATHS.agentBudget}
          cta="Edit"
          title="Budget and pacing"
          value={
            settings ? (
              <>
                {budgetSummaryOf(settings, spend, contributor?.limits)}
                {spend ? <SpendBar value={spend.cycleUsd} max={settings.cycleCapUsd} /> : null}
              </>
            ) : (
              'They start from your plan, and are yours to change.'
            )
          }
        />
      </SettingsList>
      <ReposAskLessNote className="px-1" />
      {comingSoon}
    </Block>
  );
}
