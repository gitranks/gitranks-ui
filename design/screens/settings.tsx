import type { ComponentProps, ReactNode } from 'react';

import type { Screen } from '../registry';
import { AgentGithubGroup, SettingsScreen } from '@/app/(workspace)/my/settings/components/settings-view';
import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LessonsToRepeatRow, TimeZoneRow, ZoneChoices } from '@/components/learn/settings/learn-email-rows';
import { LearnPreferencesGroup } from '@/components/learn/settings/learn-preferences-group';
import { EmailRows } from '@/components/workspace/settings/email-rows';
import { SettingsGroup, SettingsList } from '@/components/workspace/settings-rows';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { activityOf } from '@/lib/contribute/__fixtures__/agent-runs';
import { contributor, email, settingsViews } from '@/lib/contribute/__fixtures__/contribute-views';
import { BOARD_ZONES, learnEmail } from '@/lib/learn/__fixtures__/settings';
import { setupGuessed, setupSaved, setupWorking } from '@/lib/learn/__fixtures__/setup';
import type { LearnBarState } from '@/lib/learn/learn-bar';
import { type LearnEmailSettings, zoneChoicesOf } from '@/lib/learn/settings';
import type { ContributeEmailSettings, ContributeView } from '@/lib/workspace/contribute.types';

/*
 * Settings (page 23): one page for both products, as each bar opens it, and its other cases, each drawn from the
 * page's own parts with fixtures.
 */

const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

/** A learner's bar, Settings its current tab. */
const LEARNER_BAR: LearnBarState = { kind: 'learner', due: 4, pullRequests: true, pullRequestsNeedYou: 1 };

/** The board's email: sent to Lisbon's morning. */
const LISBON: ContributeEmailSettings = { ...email.on, timeZone: 'Europe/Lisbon' };

/** The page as Contribute's bar opens it: the header, then the workspace's tabs. */
const contributeFrame = (children: ReactNode) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} activity={activityOf()} needsYou={1} />
    {children}
  </>
);

/** The page as Learn's bar opens it: the header, then Learn's bar with Settings current. */
const learnFrame = (children: ReactNode) => (
  <>
    <Header />
    <LearnBar state={LEARNER_BAR} place="settings" />
    {children}
  </>
);

/** The page's own container, as its `page.tsx` draws it. */
const main = (children: ReactNode) => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">{children}</main>
);

const screen = (props: ComponentProps<typeof SettingsScreen>) => main(<SettingsScreen openPrs={1} {...props} />);

/** One case of the states board: its name, then the sections that matter. */
function Case({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-base font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** The Email group with Learn's rows: "Lessons to repeat" first from Learn, the time zone last. */
const emailGroup = (
  settings: LearnEmailSettings,
  contribute: ContributeEmailSettings = LISBON,
  savedZone?: string | null,
) => (
  <EmailRows
    settings={contribute}
    lead={<LessonsToRepeatRow on={settings.lessonsToRepeat} noAddress={!contribute.to} />}
    tail={<TimeZoneRow settings={settings} savedZone={savedZone === undefined ? contribute.timeZone : savedZone} />}
    zoneRow
  />
);

/** No agent yet: no token, no key, no settings. */
const noAgent: ContributeView = {
  ...settingsViews.learner,
  contributor: contributor({ credentials: [], plan: null, settings: null, spend: null, onboardedVia: null }),
  ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] },
};

/** The other cases, in the order of the states board. */
function SettingsStates() {
  return main(
    <div className="flex flex-col gap-12">
      <Case title="Someone who uses both, opened from Learn: Learn's own settings first, the shared sections, then Contribute's group last">
        <SettingsScreen
          view={settingsViews.both}
          bar="learn"
          learnOpen
          email={LISBON}
          learnSetup={setupSaved}
          learnEmail={learnEmail.device}
          openPrs={1}
        />
      </Case>
      <Case title="Both Learn emails on: a switch changes in place and saves at once; On and Off take the same width">
        {emailGroup(learnEmail.on)}
      </Case>
      <Case title="Learn preferences while our guess waits for the person: marked, and its button opens Set up Learn to check and save it">
        <LearnPreferencesGroup setup={setupGuessed} />
      </Case>
      <Case title="Learn preferences while we are still reading the person's GitHub profile">
        <LearnPreferencesGroup setup={setupWorking} />
      </Case>
      <Case title="No agent connected yet: the first row of Agent and GitHub says so, and its button opens the connect steps">
        <AgentGithubGroup view={noAgent} />
      </Case>
      <Case title="The time zone's list, open: a search and the cities, the one from the device marked. Choosing one saves at once">
        <SettingsGroup id="time-zone-list" title="Email">
          <SettingsList>
            <TimeZoneRow settings={learnEmail.device} savedZone="Europe/Lisbon" />
          </SettingsList>
          <div className="ml-auto w-72 overflow-hidden rounded-md border bg-popover shadow-md">
            <ZoneChoices
              choices={zoneChoicesOf(BOARD_ZONES, 'Europe/Lisbon', new Date())}
              selected="Europe/Lisbon"
              onPick={() => {}}
            />
          </div>
        </SettingsGroup>
      </Case>
      <Case title="The time zone after the person chose one, and when we could not tell it">
        <SettingsList>
          <TimeZoneRow settings={learnEmail.chosen} savedZone="Europe/Berlin" />
          <TimeZoneRow settings={learnEmail.unknown} savedZone={null} />
        </SettingsList>
      </Case>
      <Case title="No email address: the switches and choices that send email disabled under why">
        {emailGroup(learnEmail.device, email.noAddress, 'Europe/Lisbon')}
      </Case>
    </div>,
  );
}

export const SETTINGS_SCREEN: Screen = {
  id: 'settings',
  title: 'Settings',
  area: 'workspace',
  route: '/my/settings',
  sources: [
    'app/(workspace)/my/settings/components/settings-view.tsx',
    'components/workspace/workspace-tabs-nav.tsx',
    'components/learn/settings/learn-preferences-group.tsx',
    'components/learn/settings/learn-email-rows.tsx',
    'components/workspace/settings/email-rows.tsx',
    'lib/learn/settings.ts',
    'lib/workspace/email-settings.ts',
    'lib/workspace/settings-bar.ts',
    'components/workspace/settings/delete-data-section.tsx',
  ],
  states: [
    {
      id: 'contributor',
      title: "Opened from Contribute's bar by a contributor: Contribute's own settings first, Learn's last",
      path: '/my/settings',
      height: 1700,
      render: () =>
        contributeFrame(
          screen({
            view: settingsViews.contributor,
            learnOpen: true,
            email: LISBON,
            learnSetup: setupSaved,
            learnEmail: learnEmail.device,
            openPrs: 3,
          }),
        ),
    },
    {
      id: 'learner',
      title: "Opened from Learn's bar by a learner: Learn's own settings first, Settings the bar's current tab",
      path: '/my/settings?from=learn',
      height: 1600,
      render: () =>
        learnFrame(
          screen({
            view: settingsViews.learner,
            bar: 'learn',
            learnOpen: true,
            email: LISBON,
            learnSetup: setupSaved,
            learnEmail: learnEmail.device,
          }),
        ),
    },
    {
      id: 'email-hint',
      title: 'Opened from an email\'s "one summary a day instead" link: asked before switching',
      path: '/my/settings?email=daily#email',
      height: 1800,
      render: () =>
        contributeFrame(
          screen({
            view: settingsViews.both,
            learnOpen: true,
            email: LISBON,
            emailHint: 'ONCE_A_DAY',
            learnSetup: setupSaved,
            learnEmail: learnEmail.device,
            openPrs: 3,
          }),
        ),
    },
    {
      id: 'email-no-address',
      title:
        'The other cases: both from Learn, Learn emails on, our guess, profile read, no agent, time zone, no address',
      path: '/my/settings?from=learn',
      height: 4150,
      render: () => learnFrame(<SettingsStates />),
    },
    {
      id: 'email-daily-phone',
      title: 'On a phone: the three-way choice moves under its words, a switch stays on the right',
      path: '/my/settings?from=learn',
      width: 390,
      height: 2200,
      render: () =>
        learnFrame(
          screen({
            view: settingsViews.both,
            bar: 'learn',
            learnOpen: true,
            email: { ...LISBON, needsYou: 'ONCE_A_DAY' },
            learnSetup: setupSaved,
            learnEmail: learnEmail.on,
          }),
        ),
    },
  ],
};
