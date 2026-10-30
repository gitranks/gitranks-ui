import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ContributeNotices } from './contribute-notices';
import { KeyConnect } from './key-connect';
import { OwnAgentSection } from './own-agent-section';
import { PreferencesStep } from './preferences-step';
import type { ManualLimitsDraft } from '@/lib/contribute/connect-limits';
import { loadContribute, loadProfileLanguages } from '@/lib/contribute/contribute.data';
import type { ContributeSettings, ContributeView } from '@/lib/contribute/contribute.types';
import { CONNECT_AGENT_PATH } from '@/lib/contribute/contribute-path';
import { claudeKeyOf, contributeNoticesOf } from '@/lib/contribute/contribute-state';
import { LANGUAGES } from '@/lib/contribute/format';

export async function ConnectView({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params, languages] = await Promise.all([loadContribute(), searchParams, loadProfileLanguages()]);
  if (!view) notFound();
  if (params?.path === 'agent') return <OwnAgentConnectScreen view={view} />;
  return <ConnectScreen view={view} today={new Date().getUTCDate()} profileLanguages={languages} />;
}

/** Where the own-agent path starts. */
export const OWN_AGENT_PATH = CONNECT_AGENT_PATH;

/**
 * Connect with the user's own agent instead of a Claude key: what they like to work on, then a token for their agent.
 * Nothing asks for a key, and GitHub access is asked for on the first review.
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
      <PreferencesStep
        preferences={contributor?.preferences ?? null}
        step={1}
        next={`${OWN_AGENT_PATH}#own-agent` as Route}
        saveLabel="Save, then create a token"
      />
      <OwnAgentSection ownAgent={view.ownAgent} now={now} step={2} />
    </>
  );
}

/** "I'll set them myself" as a key connected that way set it, to start the form from. */
function manualOf(settings: ContributeSettings | null | undefined): Partial<ManualLimitsDraft> | undefined {
  if (!settings) return undefined;
  const amount = (value: number | null) => (value === null ? '' : String(value));
  return {
    month: amount(settings.cycleCapUsd),
    week: amount(settings.weekCapUsd),
    day: amount(settings.dayCapUsd),
    attempt: amount(settings.attemptCapUsd),
    ...(settings.pace === 'FAST' ? { pace: 'FAST' as const } : {}),
  };
}

/**
 * A1, the hosted path: the key, the limits and the reset day on one screen. A first key goes on to the matching
 * moment; a connected one is replaced here (from Settings or a notice), and the page stays. The languages the matching moment floats are
 * the user's preferences when set, else their profile's.
 */
export function ConnectScreen({
  view,
  today,
  profileLanguages = [],
}: {
  view: ContributeView;
  today: number;
  profileLanguages?: string[];
}) {
  const { contributor } = view;
  const key = claudeKeyOf(view);
  // The key's own trouble shows here; the rest of the notices belong to the other pages.
  const keyNotices = contributeNoticesOf(view).filter(({ kind }) => kind !== 'no-key');
  const preferred = (contributor?.preferences?.languages ?? []).map((language) => LANGUAGES[language]);

  return (
    <KeyConnect
      defaultPlan={contributor?.plan}
      defaultManual={contributor?.plan === 'CREDITS' ? manualOf(contributor.settings) : undefined}
      renewalDay={contributor?.settings?.renewalDay ?? null}
      guessDay={today}
      replacing={!!key}
      languages={preferred.length ? preferred : profileLanguages}
      notices={keyNotices.length ? <ContributeNotices notices={keyNotices} /> : null}
    />
  );
}
