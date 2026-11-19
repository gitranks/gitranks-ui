import { GitPullRequest, LayoutGrid } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PreferencesSection } from '@/components/contribute/preferences-section';
import { SettingsWorkGroup } from '@/components/contribute/settings-work-group';
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
import { isContributePageOpen } from '@/lib/workspace/contribute-state';
import { grantRefusalOf } from '@/lib/workspace/grant-refusal';
import { GITHUB_ACCESS_PATH, SETTINGS_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';
import { grantSummaryOf } from '@/lib/workspace/settings-summary';

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
 * changed on; email's toggles are on their rows. What the agents do and spend is on the Agent tab, and a line at the
 * top says so: links sent before the move (emails, agents' replies) still open Settings for autopilot, pause and the
 * limits.
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
      <p className="text-sm text-muted-foreground" data-moved-to-agent="">
        Autopilot, pause, the Claude key, budget and pull request limits are on the{' '}
        <Link href={WORKSPACE_PATHS.agent} prefetch={false} className="font-semibold text-link">
          Agent tab →
        </Link>
      </p>
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
