import { Cpu, GitPullRequest, KeyRound, LayoutGrid, SquareTerminal, Wallet } from 'lucide-react';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';

import { AutopilotSection } from './autopilot-section';
import { ContributeNotices } from './contribute-notices';
import { CycleSummary } from './cycle-summary';
import { DeleteDataSection } from './delete-data-section';
import { PauseButton } from './pause-button';
import { SettingsAnchors } from './settings-anchors';
import { SettingsGroup, SettingsList, SettingsRow } from './settings-rows';
import { loadContribute, loadContributeSet } from '@/lib/contribute/contribute.data';
import type { ContributeSet, ContributeView } from '@/lib/contribute/contribute.types';
import {
  claudeKeyOf,
  contributeNoticesOf,
  isContributePageOpen,
  isOwnAgentOnly,
  isPaused,
  settingsOf,
} from '@/lib/contribute/contribute-state';
import { grantRefusalOf } from '@/lib/contribute/grant-refusal';
import { SETTINGS_PATHS } from '@/lib/contribute/settings-paths';
import {
  agentSummaryOf,
  budgetSummaryOf,
  grantSummaryOf,
  keySummaryOf,
  ownAgentSummaryOf,
  preferencesSummaryOf,
  workSummaryOf,
} from '@/lib/contribute/settings-summary';

/** Reads the user for a Settings page: a 404 to someone Contribute is not open to, Contribute's home before signing up. */
export async function loadSettingsView(): Promise<ContributeView> {
  const view = await loadContribute();
  if (!view) notFound();
  if (!isContributePageOpen(view, 'settings')) redirect('/contribute');
  return view;
}

export async function SettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params, set] = await Promise.all([loadSettingsView(), searchParams, loadContributeSet()]);
  // GitHub's consent comes back here when it was not saved: its answer is on the page of keys and access.
  const grant = grantRefusalOf(params.grant);
  if (grant) redirect(`${SETTINGS_PATHS.keys}?grant=${grant}` as Route);
  // The modes are shown to the user (the read is not null) but did not load.
  return <SettingsScreen view={view} set={set} setFailed={set === undefined} />;
}

/**
 * Settings, at rest: where things stand and Pause, then each setting as a row with its value in plain words, grouped by
 * what it is about, and Delete last. Each row opens the page it is changed on; autopilot's toggle is on its row.
 */
export function SettingsScreen({
  view,
  now,
  set,
  setFailed = false,
}: {
  view: ContributeView;
  now?: Date;
  /** What the user works on; null or `undefined` when the modes are not shown, and then nothing about them is. */
  set?: ContributeSet | null;
  /** The modes are shown to the user, and what they work on did not load. */
  setFailed?: boolean;
}) {
  const { contributor } = view;
  const settings = settingsOf(view);
  // The pause and the key's trouble are shown where they are acted on, in the status card and under Keys.
  const notices = contributeNoticesOf(view).filter(({ kind }) => kind !== 'paused');
  const preferences = preferencesSummaryOf(contributor?.preferences ?? null);

  return (
    <>
      <h1 className="sr-only">Settings</h1>
      <ContributeNotices notices={notices} />
      {contributor ? <CycleSummary view={view} now={now} action={<PauseButton paused={isPaused(view)} />} /> : null}

      <SettingsGroup id="settings-work" title="What you work on">
        <SettingsList>
          <SettingsRow
            icon={LayoutGrid}
            href={SETTINGS_PATHS.work}
            title="Where your issues come from"
            value={
              set
                ? `${workSummaryOf(set)} · ${preferences}`
                : setFailed
                  ? "Your lists didn't load. Reload the page to try again; everything else here works as usual."
                  : preferences
            }
          />
        </SettingsList>
      </SettingsGroup>

      <SettingsGroup id="settings-budget" title="Budget and the agent">
        <SettingsList>
          {settings ? (
            <>
              <SettingsRow
                icon={Wallet}
                href={SETTINGS_PATHS.budget}
                title="Budget and pacing"
                value={budgetSummaryOf(settings)}
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
              enabled={settings?.autopilot ?? false}
              canSave={!!settings}
            />
          ) : null}
        </SettingsList>
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
            icon={GitPullRequest}
            href={SETTINGS_PATHS.keys}
            title="GitHub pull requests"
            value={grantSummaryOf(view.grant, view.grantAvailable)}
          />
          <SettingsRow
            icon={SquareTerminal}
            href={SETTINGS_PATHS.ownAgent}
            title="Your own agent (MCP)"
            value={ownAgentSummaryOf(view.ownAgent, now)}
          />
        </SettingsList>
      </SettingsGroup>

      <DeleteDataSection />
      <SettingsAnchors />
    </>
  );
}
