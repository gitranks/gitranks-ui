import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AccessSection } from './access-section';
import { AutopilotSection } from './autopilot-section';
import { ContributeNotices } from './contribute-notices';
import { CycleSummary } from './cycle-summary';
import { DeleteDataSection } from './delete-data-section';
import { PauseButton } from './pause-button';
import { PreferencesSection } from './preferences-section';
import { Panel, PanelTitle } from './primitives';
import { SettingsForm } from './settings-form';
import { loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf, isPaused } from '@/lib/contribute/contribute-state';

const SECTIONS = [
  ['limits', 'Spending limits'],
  ['pacing', 'Pacing'],
  ['agent', 'The agent'],
  ['prs', 'Pull requests'],
  ['autopilot', 'Autopilot'],
  ['work', 'What you work on'],
  ['access', 'Keys and access'],
  ['danger', 'Delete data'],
] as const;

export async function SettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params] = await Promise.all([loadContribute(), searchParams]);
  if (!view) notFound();
  return <SettingsScreen view={view} grantRefused={params.grant === 'refused'} />;
}

export function SettingsScreen({
  view,
  grantRefused = false,
  now,
}: {
  view: ContributeView;
  grantRefused?: boolean;
  now?: Date;
}) {
  const { contributor } = view;
  const settings = contributor?.settings ?? null;
  const key = claudeKeyOf(view);
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
                text="They start from your plan once a key is connected, and every one of them is yours to change."
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
          <AccessSection credential={key} grant={view.grant} grantRefused={grantRefused} now={now} />
          <DeleteDataSection />
        </div>
      </div>
    </>
  );
}
