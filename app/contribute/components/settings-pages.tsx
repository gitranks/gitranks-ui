import Link from 'next/link';

import { AccessSection } from './access-section';
import { ContributeNotices } from './contribute-notices';
import { OwnAgentSection } from './own-agent-section';
import { PreferencesSection } from './preferences-section';
import { Panel, PanelTitle } from './primitives';
import { ScrollToHash } from './scroll-to-hash';
import { SetSections } from './set-section';
import { SettingsForm, type SettingsSection } from './settings-form';
import { SettingsPageHead } from './settings-rows';
import { loadSettingsView } from './settings-view';
import { loadContributeSet } from '@/lib/contribute/contribute.data';
import type { ContributeSet, ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isOwnAgentOnly, settingsOf } from '@/lib/contribute/contribute-state';
import { type GrantRefusal, grantRefusalOf } from '@/lib/contribute/grant-refusal';
import { OWN_AGENT_TEXT } from '@/lib/contribute/mcp-setup';

export async function WorkSettingsView() {
  const [view, set] = await Promise.all([loadSettingsView(), loadContributeSet()]);
  return <WorkSettingsScreen view={view} set={set} setFailed={set === undefined} />;
}

/** What the user works on: the mode and its list, then the preferences, how we pick repos and the ignored repos. */
export function WorkSettingsScreen({
  view,
  now,
  set,
  setFailed = false,
}: {
  view: ContributeView;
  now?: Date;
  /** Null or `undefined` when the modes are not shown, and then nothing about them is. */
  set?: ContributeSet | null;
  /** The modes are shown to the user, and what they work on did not load. */
  setFailed?: boolean;
}) {
  const preferences = <PreferencesSection preferences={view.contributor?.preferences ?? null} modes={!!set} />;
  return (
    <>
      <SettingsPageHead
        title="What you work on"
        text="Where your issues come from, and the filters on top of it in every mode."
      />
      {set ? <SetSections set={set} now={now} preferences={preferences} /> : null}
      {!set && setFailed ? (
        <Panel id="modes">
          <PanelTitle
            title="What to work on"
            text="Your lists didn't load. Reload the page to try again; everything else here works as usual."
          />
        </Panel>
      ) : null}
      {set ? null : preferences}
      <ScrollToHash />
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
