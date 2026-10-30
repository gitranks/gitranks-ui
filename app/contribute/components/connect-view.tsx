import { notFound } from 'next/navigation';

import { AgentConnect } from './agent-connect';
import { ContributeNotices } from './contribute-notices';
import { KeyConnect } from './key-connect';
import { manualDraftFromSettings, type StoredLimits } from '@/lib/contribute/connect-limits';
import { loadContribute, loadProfileLanguages } from '@/lib/contribute/contribute.data';
import type { ContributeView } from '@/lib/contribute/contribute.types';
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
  // A key connected before (a plan is set only by a connect): the API keeps these settings, so the screen starts from
  // them and says them. Settings made without a key are not a connect's: a first key takes the defaults over them.
  const stored: StoredLimits | null =
    contributor?.plan && contributor.settings
      ? { plan: contributor.plan, settings: contributor.settings, preferences: contributor.preferences }
      : null;

  return (
    <KeyConnect
      defaultPlan={contributor?.plan}
      defaultManual={stored ? manualDraftFromSettings(stored.settings) : undefined}
      stored={stored}
      renewalDay={contributor?.settings?.renewalDay ?? null}
      guessDay={today}
      replacing={!!key}
      languages={preferred.length ? preferred : profileLanguages}
      notices={keyNotices.length ? <ContributeNotices notices={keyNotices} /> : null}
    />
  );
}
