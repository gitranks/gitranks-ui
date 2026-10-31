import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AccessSection } from './access-section';
import { ContributeNotices } from './contribute-notices';
import { ModeSwitch } from './mode-switch';
import { OwnAgentSection } from './own-agent-section';
import { Panel, PanelTitle } from './primitives';
import { ScrollToHash } from './scroll-to-hash';
import { SetListScreen } from './set-list-screen';
import { SettingsForm, type SettingsSection } from './settings-form';
import { SettingsPageHead } from './settings-rows';
import { loadSettingsView } from './settings-view';
import { loadContributeSet } from '@/lib/contribute/contribute.data';
import type { ContributeSet, ContributeSetListMode, ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isOwnAgentOnly, settingsOf } from '@/lib/contribute/contribute-state';
import { type GrantRefusal, grantRefusalOf } from '@/lib/contribute/grant-refusal';
import { OWN_AGENT_TEXT } from '@/lib/contribute/mcp-setup';
import { MODES, modeTitleOf } from '@/lib/contribute/set-format';
import { SETTINGS_PATHS, switchModeOf } from '@/lib/contribute/settings-paths';

export async function WorkSettingsView() {
  const [, set] = await Promise.all([loadSettingsView(), loadContributeSet()]);
  // Without the modes there is no list: the filters are on the summary.
  if (set === null) redirect(SETTINGS_PATHS.summary);
  return <WorkSettingsScreen set={set} setFailed={set === undefined} />;
}

/** The current mode's list, changed in place; All issues has none, and says where to pick another mode. */
export function WorkSettingsScreen({
  now,
  set,
  setFailed = false,
}: {
  now?: Date;
  set?: ContributeSet | null;
  /** The modes are shown to the user, and what they work on did not load. */
  setFailed?: boolean;
}) {
  const mode = set?.mode;
  return (
    <>
      <SettingsPageHead
        title={mode === 'STACK' ? 'Your stack' : mode === 'REPOS' ? 'Your repos' : 'What you work on'}
        text={MODES.find((entry) => entry.mode === mode)?.text}
      />
      {set && mode && mode !== 'ALL' ? <SetListScreen set={set} mode={mode} now={now} /> : null}
      {mode === 'ALL' ? (
        <Panel id="list">
          <p className="text-sm text-muted-foreground">
            All issues has no list to edit. To support your stack or your own list of repos, pick it in{' '}
            <Link href={SETTINGS_PATHS.summary} prefetch={false} className="font-semibold text-link">
              Settings
            </Link>
            .
          </p>
        </Panel>
      ) : null}
      {!set && setFailed ? (
        <Panel id="list">
          <p className="text-sm text-muted-foreground">
            Your lists didn&apos;t load. Reload the page to try again; everything else in Settings works as usual.
          </p>
        </Panel>
      ) : null}
    </>
  );
}

export async function SwitchSettingsView({ params }: { params: Promise<{ mode: string }> }) {
  const [, set, { mode: segment }] = await Promise.all([loadSettingsView(), loadContributeSet(), params]);
  const target = switchModeOf(segment);
  if (!target) notFound();
  if (!set) redirect(SETTINGS_PATHS.summary);
  // Already in it: its list is changed on its own page.
  if (set.mode === target) redirect(SETTINGS_PATHS.work);
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

/** The notices the summary shows, on the pages where they are acted on: the key's trouble, the caps reached. */
function PageNotices({ view }: { view: ContributeView }) {
  return <ContributeNotices notices={contributeNoticesOf(view).filter(({ kind }) => kind !== 'paused')} />;
}

/** With their own agent alone, or before a key: the limits have nothing to limit yet, and why. */
function NoSettingsPanel({ view }: { view: ContributeView }) {
  return (
    <Panel id="limits">
      <PanelTitle
        title="Spending limits, pacing and the agent"
        text={
          isOwnAgentOnly(view)
            ? 'Your own agent spends nothing through us. These come with a Claude key, if you connect one for hosted attempts.'
            : 'They start from your plan once a key is connected, and every one of them is yours to change.'
        }
      />
      <Link href="/contribute/connect" prefetch={false} className="text-sm font-semibold text-link">
        Connect your Claude key →
      </Link>
    </Panel>
  );
}

const FORM_PAGES = {
  budget: {
    title: 'Budget and pacing',
    text: 'How much the agent may spend, and how we spread the work across your cycle.',
    sections: ['limits', 'pacing'],
  },
  agent: {
    title: 'Agent and pull requests',
    text: 'The models the agent works with, and how large a pull request may be.',
    sections: ['agent', 'prs'],
  },
} as const satisfies Record<string, { title: string; text: string; sections: SettingsSection[] }>;

export type SettingsFormPage = keyof typeof FORM_PAGES;

export async function FormSettingsView({ page }: { page: SettingsFormPage }) {
  return <FormSettingsScreen page={page} view={await loadSettingsView()} />;
}

/** The spending limits and pacing, or the agent and pull requests. */
export function FormSettingsScreen({ page, view }: { page: SettingsFormPage; view: ContributeView }) {
  const { title, text, sections } = FORM_PAGES[page];
  const settings = settingsOf(view);
  return (
    <>
      <SettingsPageHead title={title} text={text} />
      <PageNotices view={view} />
      {settings ? <SettingsForm settings={settings} sections={[...sections]} /> : <NoSettingsPanel view={view} />}
      <ScrollToHash />
    </>
  );
}

export async function KeysSettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params] = await Promise.all([loadSettingsView(), searchParams]);
  return <KeysSettingsScreen view={view} grantRefusal={grantRefusalOf(params.grant)} />;
}

/** The Claude key and GitHub's pull request access. */
export function KeysSettingsScreen({
  view,
  grantRefusal,
  now,
}: {
  view: ContributeView;
  grantRefusal?: GrantRefusal;
  now?: Date;
}) {
  return (
    <>
      <SettingsPageHead
        title="Keys and access"
        text="The Claude key hosted attempts run on, and GitHub's permission to open pull requests for you."
      />
      <PageNotices view={view} />
      <AccessSection
        credential={claudeKeyOf(view)}
        grant={view.grant}
        grantAvailable={view.grantAvailable}
        grantRefusal={grantRefusal}
        now={now}
      />
    </>
  );
}

export async function OwnAgentSettingsView() {
  return <OwnAgentSettingsScreen view={await loadSettingsView()} />;
}

/** The tokens for the user's own agent, and its setup. */
export function OwnAgentSettingsScreen({ view, now }: { view: ContributeView; now?: Date }) {
  return (
    <>
      <SettingsPageHead title="Your own agent (MCP)" text={OWN_AGENT_TEXT} />
      <OwnAgentSection ownAgent={view.ownAgent} now={now} titled={false} />
    </>
  );
}
