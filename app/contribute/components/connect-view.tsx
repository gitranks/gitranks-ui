import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConnectKeyForm } from './connect-key-form';
import { ConsoleSteps } from './console-steps';
import { ContributeNotices } from './contribute-notices';
import { GrantCard } from './grant-card';
import { LimitsPreview } from './limits-preview';
import { OwnAgentSection } from './own-agent-section';
import { PreferencesStep } from './preferences-step';
import { SetupSteps } from './setup-steps';
import { loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf } from '@/lib/contribute/contribute-state';

/**
 * The step the user is on: the key, then GitHub access (the limits come from the plan), then preferences. An API that
 * does not tell the grant yet, or access that cannot be granted yet, does not hold the user on step 3.
 */
export function setupStepOf(view: ContributeView): number {
  if (!claudeKeyOf(view)) return 1;
  if (view.grantAvailable && view.grant && !view.grant.connected) return 3;
  if (view.contributor?.step !== 'DONE') return 4;
  return 5;
}

export async function ConnectView({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params] = await Promise.all([loadContribute(), searchParams]);
  if (!view) notFound();
  if (params?.path === 'agent') return <OwnAgentConnectScreen view={view} />;
  return <ConnectScreen view={view} today={new Date().getUTCDate()} />;
}

/** Where the own-agent path starts. */
export const OWN_AGENT_PATH = '/contribute/connect?path=agent' as Route;

/**
 * Connect with the user's own agent instead of a Claude key: GitHub access, what they like to work on, then a token
 * for their agent. Nothing asks for a key.
 */
export function OwnAgentConnectScreen({ view, now }: { view: ContributeView; now?: Date }) {
  const { contributor } = view;
  return (
    <>
      <div className="flex flex-col gap-1.5" data-connect-path="agent">
        <h1 className="text-3xl font-bold tracking-tight">Use your own agent</h1>
        <p className="max-w-2xl text-muted-foreground">
          Claude Code, Codex, Cursor or Gemini CLI on your machine picks an issue here, works on it and hands the change
          back. You review and approve every pull request here. No Claude key is needed: your agent and its model are
          your own.
        </p>
        <Link href="/contribute/connect" prefetch={false} className="text-sm font-semibold text-primary">
          Use a Claude key instead →
        </Link>
      </div>
      <GrantCard grant={view.grant} available={view.grantAvailable} returnTo={OWN_AGENT_PATH} step={1} />
      <PreferencesStep
        preferences={contributor?.preferences ?? null}
        step={2}
        next={`${OWN_AGENT_PATH}#own-agent` as Route}
        saveLabel="Save, then create a token"
      />
      <OwnAgentSection ownAgent={view.ownAgent} now={now} step={3} />
    </>
  );
}

export function ConnectScreen({ view, today }: { view: ContributeView; today: number }) {
  const { contributor } = view;
  const key = claudeKeyOf(view);
  const step = setupStepOf(view);
  // The key's own trouble shows here; the rest of the notices belong to the other pages.
  const keyNotices = contributeNoticesOf(view).filter(({ kind }) => kind !== 'no-key' && kind !== 'grant-missing');

  return (
    <>
      <SetupSteps current={step} />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight">
          {key ? 'Your Claude key is connected' : 'Connect your Claude key'}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Use a separate workspace for gitranks, so your other projects and your spend limit stay apart. It takes about
          two minutes in the Claude Console.
        </p>
        {key ? null : (
          <Link href={OWN_AGENT_PATH} prefetch={false} className="text-sm font-semibold text-primary">
            Use your own agent instead (Claude Code, Codex, Cursor, Gemini CLI) →
          </Link>
        )}
      </div>
      <ContributeNotices notices={keyNotices} />
      <div className="flex flex-wrap items-start gap-5">
        <ConsoleSteps />
        <ConnectKeyForm
          replacing={!!key}
          defaultPlan={contributor?.plan}
          defaultRenewalDay={contributor?.settings?.renewalDay ?? today}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <LimitsPreview plan={contributor?.plan} settings={contributor?.settings} />
        <GrantCard grant={view.grant} available={view.grantAvailable} returnTo="/contribute/connect" />
      </div>
      {step === 4 ? <PreferencesStep preferences={contributor?.preferences ?? null} /> : null}
      {step === 5 ? (
        <p className="text-sm text-muted-foreground">
          You are all set.{' '}
          <Link href="/contribute/issues" prefetch={false} className="font-semibold text-primary">
            See the issues picked for you →
          </Link>
        </p>
      ) : null}
    </>
  );
}
