import { Cpu, GitPullRequest, KeyRound, LayoutGrid, SquareTerminal, Wallet } from 'lucide-react';
import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { PreferencesSection } from '@/components/contribute/preferences-section';
import { SettingsWorkGroup } from '@/components/contribute/settings-work-group';
import { OwnAgentSection } from '@/components/workspace/agent/own-agent-section';
import { AutopilotSection } from '@/components/workspace/autopilot-section';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { CycleSummary } from '@/components/workspace/cycle-summary';
import { PauseButton } from '@/components/workspace/pause-button';
import { ReposAskLessNote } from '@/components/workspace/pull-request/repo-rules';
import { DeleteDataSection } from '@/components/workspace/settings/delete-data-section';
import { EmailSection } from '@/components/workspace/settings/email-section';
import { SettingsAnchors } from '@/components/workspace/settings/settings-anchors';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import {
  loadContribute,
  loadContributeEmail,
  loadContributeSet,
  loadContributeSetup,
} from '@/lib/workspace/contribute.data';
import type { ContributeEmail, ContributeSet, ContributeView } from '@/lib/workspace/contribute.types';
import {
  claudeKeyOf,
  contributeNoticesOf,
  isContributePageOpen,
  isOwnAgentOnly,
  isPaused,
  settingsOf,
} from '@/lib/workspace/contribute-state';
import { grantRefusalOf } from '@/lib/workspace/grant-refusal';
import { GITHUB_ACCESS_PATH, SETTINGS_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';
import {
  agentSummaryOf,
  budgetSummaryOf,
  grantSummaryOf,
  keySummaryOf,
  ownAgentSummaryOf,
} from '@/lib/workspace/settings-summary';

/** Reads the user for a Settings page: a 404 to someone Contribute is not open to, Contribute's home before signing up. */
export async function loadSettingsView(): Promise<ContributeView> {
  const view = await loadContribute();
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'settings')) redirect('/contribute');
  return view;
}

export async function SettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params, set, email] = await Promise.all([
    loadSettingsView(),
    searchParams,
    loadContributeSet(),
    loadContributeEmail(),
  ]);
  // GitHub's consent comes back here when it was not saved: its answer is with GitHub's access, on the key's page.
  const grant = grantRefusalOf(params.grant);
  if (grant) redirect(`${SETTINGS_PATHS.keys}?grant=${grant}#github` as Route);
  // What the user works on was asked (the read is not null) but did not load.
  return <SettingsScreen view={view} set={set} setFailed={set === undefined} email={email} />;
}

/**
 * Settings, at rest: what the user works on, GitHub's access, email, and Delete last. Each row opens the page it is
 * changed on; email's toggles are on their rows. What the agents do and spend is on the Agent tab.
 */
export function SettingsScreen({
  view,
  set,
  setFailed = false,
  email = null,
}: {
  view: ContributeView;
  /** What the user works on; null when signed out or the API hides it, `undefined` when it did not load. */
  set?: ContributeSet | null;
  /** What the user works on did not load. */
  setFailed?: boolean;
  /** Contribute's email; its group is left out when null (hidden, or not answered) or without an address to send to. */
  email?: ContributeEmail | null;
}) {
  const preferences = view.contributor?.preferences ?? null;

  return (
    <>
      <h1 className="sr-only">Settings</h1>
      {set ? (
        <SettingsWorkGroup set={set} preferences={preferences} />
      ) : (
        <SettingsGroup id="modes" title="What you work on">
          <SettingsList>
            {setFailed ? (
              <SettingsRow
                icon={LayoutGrid}
                title="Where your issues come from"
                value="Your lists didn't load. Reload the page to try again; everything else here works as usual."
              />
            ) : null}
            <PreferencesSection preferences={preferences} modes={setFailed} />
          </SettingsList>
        </SettingsGroup>
      )}

      <SettingsGroup id="settings-github" title="GitHub">
        <SettingsList>
          <SettingsRow
            icon={GitPullRequest}
            href={GITHUB_ACCESS_PATH}
            title="GitHub pull requests"
            value={grantSummaryOf(view.grant, view.grantAvailable)}
          />
        </SettingsList>
      </SettingsGroup>

      {/* Checked inline: a function from the client file can't be called here, on the server. */}
      {email?.to ? <EmailSection email={{ ...email, to: email.to }} /> : null}

      <DeleteDataSection />
      <SettingsAnchors />
    </>
  );
}

export async function AgentView() {
  return <AgentScreen view={await loadSettingsView()} />;
}

/**
 * The Agent tab, at rest: where things stand and Pause, the hosted agent's budget, model and autopilot, the
 * connections (the Claude key, the user's own agent), and the own agent's tokens and setup.
 */
export function AgentScreen({ view, now }: { view: ContributeView; now?: Date }) {
  const { contributor } = view;
  const settings = settingsOf(view);
  // The pause and the key's trouble are shown where they are acted on, in the status card and under the key.
  const notices = contributeNoticesOf(view).filter(({ kind }) => kind !== 'paused');

  return (
    <>
      <h1 className="sr-only">Agent</h1>
      <ContributeNotices notices={notices} />
      {contributor ? <CycleSummary view={view} now={now} action={<PauseButton paused={isPaused(view)} />} /> : null}

      <SettingsGroup id="settings-budget" title="Budget and the agent">
        <SettingsList>
          {settings ? (
            <>
              <SettingsRow
                icon={Wallet}
                href={SETTINGS_PATHS.budget}
                title="Budget and pacing"
                value={budgetSummaryOf(settings, contributor?.limits)}
              />
              <SettingsRow
                icon={Cpu}
                href={SETTINGS_PATHS.agent}
                title="Agent and pull requests"
                value={agentSummaryOf(settings)}
              />
            </>
          ) : (
            <SettingsRow
              icon={Wallet}
              href={SETTINGS_PATHS.budget}
              title="Spending limits, pacing and the agent"
              value={
                isOwnAgentOnly(view)
                  ? 'Your own agent spends nothing through us. These come with a Claude key, if you connect one for hosted attempts.'
                  : 'They start from your plan once a key is connected, and every one of them is yours to change.'
              }
            />
          )}
          {contributor ? (
            <AutopilotSection
              autopilot={contributor.autopilot}
              login={contributor.login}
              enabled={settings?.autopilot ?? false}
              canSave={!!settings}
            />
          ) : null}
        </SettingsList>
        <ReposAskLessNote className="px-1" />
      </SettingsGroup>

      <SettingsGroup id="settings-connections" title="Connections">
        <SettingsList>
          <SettingsRow
            icon={KeyRound}
            href={SETTINGS_PATHS.keys}
            title="Claude API key"
            value={keySummaryOf(claudeKeyOf(view))}
            data={{ 'data-key-state': claudeKeyOf(view)?.state ?? 'none' }}
          />
          <SettingsRow
            icon={SquareTerminal}
            href={OWN_AGENT_ANCHOR}
            title="Your own agent (MCP)"
            value={ownAgentSummaryOf(view.ownAgent, now)}
          />
        </SettingsList>
      </SettingsGroup>

      <OwnAgentSection ownAgent={view.ownAgent} now={now} />
    </>
  );
}

/** The own agent's section, further down the Agent tab. */
const OWN_AGENT_ANCHOR = `${SETTINGS_PATHS.ownAgent}#own-agent` as Route;
