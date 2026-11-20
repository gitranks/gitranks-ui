import { LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { loadSettingsView } from './settings-view';
import { LearnSettingUp } from '@/app/learn/components/learn-setting-up';
import { ModeSwitch } from '@/components/contribute/mode-switch';
import { PreferencesSection } from '@/components/contribute/preferences-section';
import { SetListScreen } from '@/components/contribute/set-list-screen';
import { SettingsWorkGroup } from '@/components/contribute/settings-work-group';
import { LearnProfileForm } from '@/components/learn/learn-profile-form';
import { GithubAccessSection } from '@/components/workspace/agent/access-section';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { Panel, PanelTitle } from '@/components/workspace/primitives';
import { ScrollToHash } from '@/components/workspace/scroll-to-hash';
import { SettingsForm } from '@/components/workspace/settings/settings-form';
import { SettingsGroup, SettingsList, SettingsPageHead, SettingsRow } from '@/components/workspace/settings-rows';
import { MODES, modeTitleOf } from '@/lib/contribute/set-format';
import { loadLearnOpen, loadLearnProfile, loadLearnSetup } from '@/lib/learn/learn.data';
import type { LearnProfile } from '@/lib/learn/learn.types';
import { loadContribute, loadContributeSet, loadContributeSetup } from '@/lib/workspace/contribute.data';
import type {
  ContributePreferences,
  ContributeSet,
  ContributeSetListMode,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { accessNoticesOf } from '@/lib/workspace/contribute-state';
import { type GrantRefusal, grantRefusalOf } from '@/lib/workspace/grant-refusal';
import { SETTINGS_PATHS, switchModeOf, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';

/** Settings' own pages: Save goes back to it. */
const BACK_TO_SETTINGS = { href: SETTINGS_PATHS.summary, label: 'Settings' };

export async function WorkSettingsView() {
  const [view, set] = await Promise.all([loadSettingsView(), loadContributeSet()]);
  return (
    <WorkSettingsScreen set={set} setFailed={set === undefined} preferences={view.contributor?.preferences ?? null} />
  );
}

/**
 * What you work on: the modes, the filters and the ignored repos, with the current mode's list changed in place. With
 * no set (the API hides it, or it did not load), the filters alone, and why when it did not load.
 */
export function WorkSettingsScreen({
  now,
  set,
  setFailed = false,
  preferences = null,
}: {
  now?: Date;
  set?: ContributeSet | null;
  /** What the user works on did not load. */
  setFailed?: boolean;
  preferences?: ContributePreferences | null;
}) {
  const mode = set?.mode;
  return (
    <>
      <SettingsPageHead title="What you work on" text={MODES.find((entry) => entry.mode === mode)?.text} />
      {set ? (
        <SettingsWorkGroup
          set={set}
          preferences={preferences}
          title="Your mode, filters and ignored repos"
          list={mode && mode !== 'ALL' ? <SetListScreen set={set} mode={mode} now={now} /> : null}
        />
      ) : (
        <SettingsGroup id="modes" title="Your filters">
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
      <ScrollToHash />
    </>
  );
}

export async function SwitchSettingsView({ params }: { params: Promise<{ mode: string }> }) {
  const [, set, { mode: segment }] = await Promise.all([loadSettingsView(), loadContributeSet(), params]);
  const target = switchModeOf(segment);
  if (!target) notFound();
  // No set, or already in it: the modes and the list are on the work page.
  if (!set || set.mode === target) redirect(SETTINGS_PATHS.work);
  return <SwitchSettingsScreen set={set} target={target} />;
}

/** The guided switch to a mode with a list. */
export function SwitchSettingsScreen({
  set,
  target,
  now,
}: {
  set: ContributeSet;
  target: ContributeSetListMode;
  now?: Date;
}) {
  return (
    <>
      <SettingsPageHead
        title={`Switch to ${modeTitleOf(target)}`}
        text={`${MODES.find((entry) => entry.mode === target)?.text} Your current mode goes on until you switch.`}
      />
      <ModeSwitch set={set} target={target} now={now} />
    </>
  );
}

export async function GithubSettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params] = await Promise.all([loadContribute(), searchParams]);
  if (!view) contributeHidden(await loadContributeSetup());
  return <GithubSettingsScreen view={view} grantRefusal={grantRefusalOf(params.grant)} />;
}

/**
 * GitHub's permission to open pull requests, for every account whichever agent works for it: allow it, see it, revoke
 * it; and why GitHub's consent was not saved, when it came back with a `grant` refusal.
 */
export function GithubSettingsScreen({ view, grantRefusal }: { view: ContributeView; grantRefusal?: GrantRefusal }) {
  return (
    <>
      <SettingsPageHead
        title="GitHub access"
        text="Our permission to open pull requests in your name, whichever agent does the work."
      />
      <GithubAccessSection grant={view.grant} grantAvailable={view.grantAvailable} grantRefusal={grantRefusal} />
    </>
  );
}

export async function PullRequestsSettingsView() {
  return <PullRequestsSettingsScreen view={await loadSettingsView()} />;
}

/**
 * The limits on the user's pull requests and attempts, which bind both agents: size, open at a time, attempts at a time
 * and the sign-off, one form, one Save (W1 §10.4). Read from the stored settings, so an account with its own agent alone
 * changes them too; before the API has them, why.
 */
export function PullRequestsSettingsScreen({ view }: { view: ContributeView }) {
  const settings = view.contributor?.settings ?? null;
  return (
    <>
      <SettingsPageHead
        title="Pull requests"
        text="How large a pull request may be, how many are open and in work at once, and the sign-off. For both agents."
      />
      <ContributeNotices notices={accessNoticesOf(view)} />
      {settings ? (
        <SettingsForm
          settings={settings}
          page="pull-requests"
          limits={view.contributor?.limits}
          back={BACK_TO_SETTINGS}
        />
      ) : (
        <Panel id="pull-requests">
          <PanelTitle
            title="Not set yet"
            text="These start when your agent connects, and every one of them is yours to change."
          />
          <Link href={WORKSPACE_PATHS.agentConnect} prefetch={false} className="text-sm font-semibold text-link">
            Connect your agent →
          </Link>
        </Panel>
      )}
      <ScrollToHash />
    </>
  );
}

export async function GoalSettingsView() {
  const profile = loadLearnProfile();
  const settingUp = loadLearnSetup();
  // Read together; a closed Learn is a 404 whatever the profile read does.
  profile.catch(() => {});
  if (!(await loadLearnOpen())) notFound();
  return <GoalSettingsScreen profile={await profile} settingUp={await settingUp} />;
}

/**
 * Goal and level (W1 §10.4): the form every lesson is written for; Save goes back to Settings. While a new account is
 * being set up, the setup line stands in for the form. `profile` is null before the user has one.
 */
export function GoalSettingsScreen({
  profile,
  settingUp = false,
}: {
  profile: LearnProfile | null;
  settingUp?: boolean;
}) {
  return (
    <>
      <SettingsPageHead
        title="Goal and level"
        text="Your agent writes each lesson for these answers. Change them any time; the next lesson follows."
      />
      {settingUp ? <LearnSettingUp /> : <LearnProfileForm profile={profile} />}
    </>
  );
}
