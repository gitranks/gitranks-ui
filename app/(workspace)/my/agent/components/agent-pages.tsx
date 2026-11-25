import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { loadSettingsView } from '@/app/(workspace)/my/settings/components/settings-view';
import { KeyPanel } from '@/components/workspace/agent/access-section';
import { ConnectScreen } from '@/components/workspace/agent/connect-view';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { Panel, PanelTitle } from '@/components/workspace/primitives';
import { ScrollToHash } from '@/components/workspace/scroll-to-hash';
import { SettingsAnchors } from '@/components/workspace/settings/settings-anchors';
import { SettingsForm } from '@/components/workspace/settings/settings-form';
import { SettingsPageHead } from '@/components/workspace/settings-rows';
import { loadContribute, loadContributeSetup, loadProfileLanguages } from '@/lib/workspace/contribute.data';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isOwnAgentOnly, settingsOf } from '@/lib/workspace/contribute-state';
import { signsOf, signTargetOf } from '@/lib/workspace/gate';
import { grantRefusalOf } from '@/lib/workspace/grant-refusal';
import { SETTINGS_PATHS, searchParamsOf, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';

/** The Agent tab's own pages: Save goes back to it. */
const BACK_TO_AGENT = { href: WORKSPACE_PATHS.agent, label: 'the Agent tab' };

/** The notices the Agent tab shows, on the pages where they are acted on: the key's trouble, the caps reached. */
function PageNotices({ view }: { view: ContributeView }) {
  return <ContributeNotices notices={contributeNoticesOf(view)} />;
}

/** The panel's title on each page, before a key: what that page would set. */
const NO_SETTINGS_TITLES = {
  budget: 'Spending limits and pacing',
  model: 'The model and its effort',
} as const satisfies Record<AgentFormPage, string>;

/** With their own agent alone, or before a key: the hosted agent's settings have nothing to set yet, and why. */
function NoSettingsPanel({ view, page }: { view: ContributeView; page: AgentFormPage }) {
  return (
    <Panel id="limits">
      <PanelTitle
        title={NO_SETTINGS_TITLES[page]}
        text={
          isOwnAgentOnly(view)
            ? 'Your own agent spends nothing through us. These come with a Claude key, if you connect one for hosted attempts.'
            : 'They start from your plan once a key is connected, and every one of them is yours to change.'
        }
      />
      <Link href={WORKSPACE_PATHS.agentKey} prefetch={false} className="text-sm font-semibold text-link">
        Connect your Claude key →
      </Link>
    </Panel>
  );
}

/** The hosted agent's two settings pages. */
export type AgentFormPage = 'budget' | 'model';

const FORM_PAGES = {
  budget: {
    title: 'Budget and pacing',
    text: 'How much the hosted agent may spend, and how we spread the work across your cycle.',
  },
  model: {
    title: 'Model and effort',
    text: 'The models the hosted agent works with, and how much effort it puts in.',
  },
} as const satisfies Record<AgentFormPage, { title: string; text: string }>;

export async function FormSettingsView({ page }: { page: AgentFormPage }) {
  return <FormSettingsScreen page={page} view={await loadSettingsView()} />;
}

/**
 * The hosted agent's budget and pacing, or its model and effort. The model page sends an old link to its pull request
 * block (`#prs`, from before the limits moved to Settings) on to Settings' pull requests page.
 */
export function FormSettingsScreen({ page, view }: { page: AgentFormPage; view: ContributeView }) {
  const { title, text } = FORM_PAGES[page];
  const settings = settingsOf(view);
  return (
    <>
      <SettingsPageHead title={title} text={text} back="agent" />
      <PageNotices view={view} />
      {settings ? (
        <SettingsForm settings={settings} page={page} limits={view.contributor?.limits} back={BACK_TO_AGENT} />
      ) : (
        <NoSettingsPanel view={view} page={page} />
      )}
      {page === 'model' ? <SettingsAnchors only={['prs']} /> : <ScrollToHash />}
    </>
  );
}

export async function KeyView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params, languages] = await Promise.all([loadContribute(), searchParams, loadProfileLanguages()]);
  if (!view) contributeHidden(await loadContributeSetup());
  // GitHub's consent came back here before its page moved to Settings: its answer is there now.
  const grant = grantRefusalOf(params.grant);
  if (grant) redirect(`${SETTINGS_PATHS.github}?grant=${grant}` as Route);
  // The hosted agent works for Contribute only: without its sign, a key is saved in Contribute's setup.
  const to = signTargetOf(WORKSPACE_PATHS.agentKey, searchParamsOf(params), signsOf(view));
  if (to) redirect(to);
  return (
    <KeyScreen
      view={view}
      replace={params.replace === '1'}
      today={new Date().getUTCDate()}
      profileLanguages={languages}
    />
  );
}

/**
 * The Claude key the hosted agent runs on: connect one when there is none (or over the one there is, `replace`), else
 * the key itself. GitHub's permission to open pull requests is in Settings.
 */
export function KeyScreen({
  view,
  replace = false,
  today,
  profileLanguages,
  now,
}: {
  view: ContributeView;
  replace?: boolean;
  today: number;
  profileLanguages?: string[];
  now?: Date;
}) {
  const key = claudeKeyOf(view);
  // GitHub's access was on this page until it got its own: a link or a consent still carrying `#github` goes there.
  const github = <SettingsAnchors only={['github']} />;
  if (!key || replace) {
    return (
      <>
        <ConnectScreen view={view} today={today} profileLanguages={profileLanguages} inWorkspace />
        {github}
      </>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {github}
      <SettingsPageHead title="Claude API key" text="The key hosted attempts run on." back="agent" />
      <PageNotices view={view} />
      <KeyPanel credential={key} now={now} />
    </div>
  );
}
