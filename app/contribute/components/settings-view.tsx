import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AccessSection } from './access-section';
import { AutopilotSection } from './autopilot-section';
import { ContributeNotices } from './contribute-notices';
import { CycleSummary } from './cycle-summary';
import { DeleteDataSection } from './delete-data-section';
import { OwnAgentSection } from './own-agent-section';
import { PauseButton } from './pause-button';
import { PreferencesSection } from './preferences-section';
import { Panel, PanelTitle } from './primitives';
import { ScrollToHash } from './scroll-to-hash';
import { SettingsForm } from './settings-form';
import { loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isOwnAgentOnly, isPaused } from '@/lib/contribute/contribute-state';
import { type GrantRefusal, grantRefusalOf } from '@/lib/contribute/grant-refusal';

const SECTIONS = [
  ['limits', 'Spending limits'],
  ['pacing', 'Pacing'],
  ['agent', 'The agent'],
  ['prs', 'Pull requests'],
  ['autopilot', 'Autopilot'],
  ['work', 'What you work on'],
  ['access', 'Keys and access'],
  ['own-agent', 'Your own agent'],
  ['danger', 'Delete data'],
] as const;

export async function SettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params] = await Promise.all([loadContribute(), searchParams]);
  if (!view) notFound();
  return <SettingsScreen view={view} grantRefusal={grantRefusalOf(params.grant)} />;
}

export function SettingsScreen({
  view,
  grantRefusal,
  now,
}: {
  view: ContributeView;
  grantRefusal?: GrantRefusal;
  now?: Date;
}) {
  const { contributor } = view;
  const key = claudeKeyOf(view);
  // With their own agent alone and no plan, the spending limits have nothing to limit: they come with a key.
  const settings = isOwnAgentOnly(view) && !contributor?.plan ? null : (contributor?.settings ?? null);
  // The pause and the key's trouble are shown where they are acted on, in the status card and under Keys.
  const notices = contributeNoticesOf(view).filter(({ kind }) => kind !== 'paused');

  return (
    <>
      <ContributeNotices notices={notices} />
      {contributor ? <CycleSummary view={view} now={now} action={<PauseButton paused={isPaused(view)} />} /> : null}
      <div className="flex flex-wrap items-start gap-6">
        <nav
          aria-label="Settings sections"
          className="flex flex-[0_1_200px] flex-col gap-0.5 text-sm max-md:hidden md:sticky md:top-4"
        >
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4.5">
          {settings ? (
            <SettingsForm settings={settings} />
          ) : (
            <Panel id="limits">
              <PanelTitle
                title="Spending limits, pacing and the agent"
                text={
                  isOwnAgentOnly(view)
                    ? 'Your own agent spends nothing through us. These come with a Claude key, if you connect one for hosted attempts.'
                    : 'They start from your plan once a key is connected, and every one of them is yours to change.'
                }
              />
              <Link href="/contribute/connect" prefetch={false} className="text-sm font-semibold text-primary">
                Connect your Claude key →
              </Link>
            </Panel>
          )}
          {contributor ? (
            <AutopilotSection
              autopilot={contributor.autopilot}
              enabled={settings?.autopilot ?? false}
              canSave={!!settings}
            />
          ) : null}
          <PreferencesSection preferences={contributor?.preferences ?? null} />
          <AccessSection
            credential={key}
            grant={view.grant}
            grantAvailable={view.grantAvailable}
            grantRefusal={grantRefusal}
            now={now}
          />
          <OwnAgentSection ownAgent={view.ownAgent} now={now} />
          <DeleteDataSection />
        </div>
      </div>
      <ScrollToHash />
    </>
  );
}
