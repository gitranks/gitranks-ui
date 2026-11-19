import { AgentConnect, type AgentConnectProof } from './agent-connect';
import { KeyConnect } from './key-connect';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { manualDraftFromSettings, type StoredLimits } from '@/lib/workspace/connect-limits';
import { loadAttempt, loadContribute, loadContributeSetup } from '@/lib/workspace/contribute.data';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isOnboarded, withoutAccessNotices } from '@/lib/workspace/contribute-state';
import { LANGUAGES } from '@/lib/workspace/format';
import { CONNECT_AGENT_PATH } from '@/lib/workspace/paths';
import { proofParamOf, proofPromptOf } from '@/lib/workspace/proof';
import { contributeHidden } from '@/lib/workspace/setting-up';

/** The own agent's connect page: the agent, a token and its setup, then the agent's first call. */
export async function OwnAgentConnectView({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params] = await Promise.all([loadContribute(), searchParams]);
  if (!view) contributeHidden(await loadContributeSetup());
  return <OwnAgentConnectScreen view={view} proof={await proofOf(proofParamOf(params?.proof))} />;
}

/** Where the own-agent path starts. */
export const OWN_AGENT_PATH = CONNECT_AGENT_PATH;

/**
 * B1, the own-agent path: the agent, a token and its setup, then the agent's first call. Nothing asks for a key or for
 * preferences (guessed, changed in Settings), and GitHub access is asked for on the first review.
 */
export function OwnAgentConnectScreen({
  view,
  proof = null,
}: {
  view: ContributeView;
  proof?: AgentConnectProof | null;
}) {
  return (
    <AgentConnect
      onboarded={isOnboarded(view)}
      tokens={view.ownAgent?.tokens}
      proof={proof}
      signIn={view.ownAgent?.signIn === true}
      openedAt={new Date().toISOString()}
    />
  );
}

/**
 * The proof the page was reached for (`?proof=<attemptId>`): the user's own contribution with an open pull request and
 * a bot's ask for proof. Anything else, or an API that does not answer, leaves the page as it is.
 */
async function proofOf(attemptId: string | null): Promise<AgentConnectProof | null> {
  if (!attemptId) return null;
  const attempt = await loadAttempt(attemptId).catch(() => undefined);
  const pr = attempt?.pullRequest;
  if (attempt?.kind !== 'FIRST' || pr?.state !== 'OPEN' || !attempt.proof?.ask) return null;
  return { attemptId: attempt.attemptId, prompt: proofPromptOf(attempt.nameWithOwner, pr.number), prNumber: pr.number };
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
  const keyNotices = withoutAccessNotices(contributeNoticesOf(view)).filter(({ kind }) => kind !== 'no-key');
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
