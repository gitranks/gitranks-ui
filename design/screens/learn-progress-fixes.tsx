import type { ComponentProps, ReactNode } from 'react';

import type { Screen } from '../registry';
import { MY_PROGRESS_SOURCES, ProgressFrame } from './learn-progress';
import { SettingsScreen } from '@/app/(workspace)/my/settings/components/settings-view';
import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import {
  type MyFixesRead,
  type MyWalkthroughsRead,
  ProgressBody,
  type ViewList,
} from '@/components/learn/my-progress/my-progress-live';
import { DaysBoxView } from '@/components/learn/my-progress/my-progress-parts';
import { NewIssuesRow } from '@/components/learn/settings/learn-email-rows';
import { SettingsGroup, SettingsList } from '@/components/workspace/settings-rows';
import { email, settingsViews } from '@/lib/contribute/__fixtures__/contribute-views';
import {
  historyWithFixes,
  myFixes,
  myProgress,
  myProgressWithFixes,
  myWalkthroughs,
  PROGRESS_TODAY,
} from '@/lib/learn/__fixtures__/my-progress';
import { learnEmail, learnIssuesEmail } from '@/lib/learn/__fixtures__/settings';
import { setupSaved } from '@/lib/learn/__fixtures__/setup';
import type { LearnBarState } from '@/lib/learn/learn-bar';
import { calendarOf, daysLineOf, type MyProgressView } from '@/lib/learn/my-progress';
import type { NoFixEnd } from '@/lib/learn/my-progress-fixes';

/*
 * My progress's views of real fixes (page 18): "Your fixes" and "Walkthroughs" with their lists, their empty ends, a
 * list on its way and one that did not come; History's lines of a fix merged and a walkthrough passed; and the gold
 * border of a day a fix was merged, with its card. Then Settings' row "New issues for you". From fixtures, on the
 * boards' own day (Sunday 22 Nov 2026). Held back from the export (`exported: false`): the export is at its file limit.
 */

const noop = () => {};
const NO_END: NoFixEnd = { openIssues: null, email: null };
const ready = <T,>(read: T): ViewList<T> => ({ kind: 'ready', read });

function Body({
  view,
  fixes = null,
  walkthroughs = null,
}: {
  view: MyProgressView;
  fixes?: ViewList<MyFixesRead> | null;
  walkthroughs?: ViewList<MyWalkthroughsRead> | null;
}) {
  return (
    <ProgressBody
      progress={myProgressWithFixes}
      today={PROGRESS_TODAY}
      view={view}
      history={{ kind: 'ready', from: null, days: historyWithFixes.days, more: 'more', focus: null }}
      onMore={noop}
      onHistoryReload={noop}
      fixes={fixes}
      onFixesReload={noop}
      walkthroughs={walkthroughs}
      onWalkthroughsReload={noop}
    />
  );
}

/** One state of My progress: the frame with Learn's bar, and the page in the view. */
const progressState = (title: string, height: number, body: ReactNode) => () => (
  <ProgressFrame title={title} height={height}>
    {body}
  </ProgressFrame>
);

const PROGRESS_PATH = '/learn/progress';
const FIXES_PATH = '/learn/progress?view=fixes';
const WALKTHROUGHS_PATH = '/learn/progress?view=walkthroughs';

const LEARNER_BAR: LearnBarState = { kind: 'learner', due: 4, pullRequests: true, pullRequestsNeedYou: 0 };
const LISBON = { ...email.on, timeZone: 'Europe/Lisbon' };

/** Settings as Learn's bar opens it, with the row's read answered. */
const settings = (props: Partial<ComponentProps<typeof SettingsScreen>>) => (
  <>
    <Header />
    <LearnBar state={LEARNER_BAR} place="settings" />
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
      <SettingsScreen
        view={settingsViews.learner}
        bar="learn"
        email={LISBON}
        learnSetup={setupSaved}
        learnEmail={learnEmail.device}
        openPrs={1}
        {...props}
      />
    </main>
  </>
);

/** The row alone, in each of its cases. */
const NewIssuesCases = () => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
    {(
      [
        ['Off, as it starts', learnIssuesEmail.off, false],
        ['On', learnIssuesEmail.forYou, false],
        ['No email address: says so, and cannot be turned on', learnIssuesEmail.off, true],
      ] as const
    ).map(([title, setting, noAddress]) => (
      <SettingsGroup key={title} id={`new-issues-${title.length}`} title={title}>
        <SettingsList>
          <NewIssuesRow setting={setting} noAddress={noAddress} />
        </SettingsList>
      </SettingsGroup>
    ))}
  </main>
);

export const LEARN_PROGRESS_FIXES_SCREENS: Screen[] = [
  {
    id: 'learn-progress-fixes',
    title: 'My progress: Your fixes, Walkthroughs, and a day with a fix',
    area: 'learn',
    route: '/learn/progress',
    exported: false,
    sources: [
      ...MY_PROGRESS_SOURCES,
      'components/learn/my-progress/my-progress-fixes.tsx',
      'lib/learn/my-progress-fixes.ts',
      'app/api/me/learn/progress/fixes/route.ts',
      'app/api/me/learn/progress/walkthroughs/route.ts',
    ],
    states: [
      {
        id: 'fixes',
        title: 'Your fixes: open, merged (one made its lesson Mastered), closed, newest first',
        path: FIXES_PATH,
        height: 1320,
        render: progressState('Your fixes', 1320, <Body view="fixes" fixes={ready({ fixes: myFixes, end: NO_END })} />),
      },
      {
        id: 'fixes-none-issues',
        title: 'Your fixes with none yet: the open issues that fit, and the way to them',
        path: FIXES_PATH,
        height: 900,
        render: progressState(
          'Your fixes, none yet, issues fit',
          900,
          <Body view="fixes" fixes={ready({ fixes: [], end: { openIssues: 12, email: null } })} />,
        ),
      },
      {
        id: 'fixes-none-email',
        title: 'Your fixes with none yet and no issue fitting now: the email for a new one',
        path: FIXES_PATH,
        height: 940,
        render: progressState(
          'Your fixes, none yet, no issue fits',
          940,
          <Body
            view="fixes"
            fixes={ready({ fixes: [], end: { openIssues: 0, email: { emailOn: false, emailTo: 'mona@example.com' } } })}
          />,
        ),
      },
      {
        id: 'fixes-waiting',
        title: 'Your fixes on its way, and when it did not come',
        path: FIXES_PATH,
        height: 1240,
        render: () => (
          <div className="flex flex-col gap-6">
            <ProgressFrame title="On its way" height={620}>
              <Body view="fixes" fixes={{ kind: 'pending' }} />
            </ProgressFrame>
            <ProgressFrame title="Did not come" height={600}>
              <Body view="fixes" fixes={{ kind: 'failed' }} />
            </ProgressFrame>
          </div>
        ),
      },
      {
        id: 'walkthroughs',
        title: "Walkthroughs: the walkthroughs of other people's fixes passed, newest first",
        path: WALKTHROUGHS_PATH,
        height: 1020,
        render: progressState(
          'Walkthroughs',
          1020,
          <Body view="walkthroughs" walkthroughs={ready({ walkthroughs: myWalkthroughs, fixes: null })} />,
        ),
      },
      {
        id: 'walkthroughs-none',
        title: 'Walkthroughs with none passed: the merged fixes that have one, or none yet',
        path: WALKTHROUGHS_PATH,
        height: 1800,
        render: () => (
          <div className="flex flex-col gap-6">
            <ProgressFrame title="Fixes have one" height={880}>
              <Body view="walkthroughs" walkthroughs={ready({ walkthroughs: [], fixes: 5 })} />
            </ProgressFrame>
            <ProgressFrame title="None yet" height={880}>
              <Body view="walkthroughs" walkthroughs={ready({ walkthroughs: [], fixes: null })} />
            </ProgressFrame>
          </div>
        ),
      },
      {
        id: 'walkthroughs-failed',
        title: 'Walkthroughs did not come',
        path: WALKTHROUGHS_PATH,
        height: 620,
        render: progressState(
          'Walkthroughs did not come',
          620,
          <Body view="walkthroughs" walkthroughs={{ kind: 'failed' }} />,
        ),
      },
      {
        id: 'history',
        title: "History: a day's merged fix first, to the pull request, then a walkthrough passed",
        path: `${PROGRESS_PATH}?view=history`,
        height: 1500,
        render: progressState('History with a fix and a walkthrough', 1500, <Body view="history" />),
      },
      {
        id: 'day-merged',
        title: 'Days: the gold border of the day a fix was merged, its card open',
        path: PROGRESS_PATH,
        height: 420,
        render: progressState(
          'The day a fix was merged',
          420,
          <DaysBoxView
            calendar={calendarOf(myProgressWithFixes.days, PROGRESS_TODAY)}
            line={daysLineOf(myProgress, PROGRESS_TODAY)}
            today={PROGRESS_TODAY}
            pointed="2026-11-20"
          />,
        ),
      },
    ],
  },
  {
    id: 'settings-new-issues',
    title: 'Settings: New issues for you',
    area: 'workspace',
    route: '/my/settings',
    exported: false,
    sources: [
      'components/learn/settings/learn-email-rows.tsx',
      'app/(workspace)/my/settings/components/settings-view.tsx',
      'lib/learn/settings.ts',
      'lib/learn/settings.data.ts',
    ],
    states: [
      {
        id: 'from-learn',
        title: 'Opened from Learn: the row under "Lessons to repeat", off as it starts',
        path: '/my/settings?from=learn',
        height: 1700,
        render: () => settings({ learnIssuesEmail: learnIssuesEmail.off }),
      },
      {
        id: 'cases',
        title: 'The row: off, on, and with no email address',
        path: '/my/settings?from=learn',
        height: 620,
        render: () => <NewIssuesCases />,
      },
    ],
  },
];
