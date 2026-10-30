import { notFound } from 'next/navigation';

import { AgentConnect } from './agent-connect';
import { ContributeNotices } from './contribute-notices';
import { KeyConnect } from './key-connect';
import type { ManualLimitsDraft } from '@/lib/contribute/connect-limits';
import { loadContribute, loadProfileLanguages } from '@/lib/contribute/contribute.data';
import type { ContributeSettings, ContributeView } from '@/lib/contribute/contribute.types';
import { CONNECT_AGENT_PATH } from '@/lib/contribute/contribute-path';
import { claudeKeyOf, contributeNoticesOf, isOnboarded } from '@/lib/contribute/contribute-state';
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
 * B1, the own-agent path: the agent, a token and its setup, then the agent's first call. Nothing asks for a key or for
 * preferences (guessed, changed in Settings), and GitHub access is asked for on the first review.
 */
export function OwnAgentConnectScreen({ view }: { view: ContributeView }) {
  return <AgentConnect onboarded={isOnboarded(view)} tokens={view.ownAgent?.tokens} />;
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
