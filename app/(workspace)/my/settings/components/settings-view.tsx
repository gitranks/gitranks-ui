import { Bot, FileDiff, GitPullRequest, Layers, Lock, PenLine, SlidersHorizontal } from 'lucide-react';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { setSkillsHiddenAction } from '@/app/profile/[login]/components/skills-hidden.actions';
import {
  LearnEmailFailedRow,
  LessonIssuesRow,
  LessonsToRepeatRow,
  NewIssuesRow,
  TimeZoneRow,
} from '@/components/learn/settings/learn-email-rows';
import { LearnPreferencesGroup } from '@/components/learn/settings/learn-preferences-group';
import { SkillsPrivacyGroup } from '@/components/skills/skills-privacy-group';
import { PageTitle } from '@/components/workspace/primitives';
import { ReposAskLessNote } from '@/components/workspace/pull-request/repo-rules';
import { DeleteDataSection } from '@/components/workspace/settings/delete-data-section';
import { EmailRows } from '@/components/workspace/settings/email-rows';
import { SettingsAnchors } from '@/components/workspace/settings/settings-anchors';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { modeTitleOf } from '@/lib/contribute/set-format';
import { preferencesSummaryOf } from '@/lib/contribute/work-summary';
import type { LearnEmailSettings, LearnIssuesEmailSetting, LearnLessonIssuesSetting } from '@/lib/learn/settings';
import {
  loadLearnEmailSettings,
  loadLearnIssuesEmail,
  loadLearnLessonIssuesEmail,
  loadLearnSetupForSettings,
} from '@/lib/learn/settings.data';
import type { LearnSetupRead } from '@/lib/learn/setup';
import { loadSkillsMine } from '@/lib/skills/skills.data';
import { openPrsOverrideOf } from '@/lib/workspace/access-limits';
import { audienceOf } from '@/lib/workspace/audience';
import {
  loadContribute,
  loadContributeEmailSettings,
  loadContributeSet,
  loadContributeSetupState,
  loadScheduleCounts,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import type {
  ContributeEmailSettings,
  ContributeNeedsYouEmail,
  ContributeSet,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isContributePageOpen } from '@/lib/workspace/contribute-state';
import { emailHintOf } from '@/lib/workspace/email-settings';
import { grantRefusalOf } from '@/lib/workspace/grant-refusal';
import { autopilotOnOf } from '@/lib/workspace/hosted-level';
import { SETTINGS_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';
import { LAST_BAR_COOKIE, lastBarOf, type ProductBar, settingsBarOf } from '@/lib/workspace/settings-bar';
import {
  agentSummaryOf,
  attemptsSummaryOf,
  dcoSummaryOf,
  grantSummaryOf,
  openPrsSummaryOf,
  prSizeSummaryOf,
} from '@/lib/workspace/settings-summary';

/** Reads the user for a Settings page: a 404 to someone Contribute is not open to, Contribute's home before signing up. */
export async function loadSettingsView(): Promise<ContributeView> {
  const view = await loadSummaryView();
  if (!isContributePageOpen(view, 'settings')) redirect('/contribute');
  return view;
}

/**
 * Reads the user for the summary, which opens to every account in the workspace, one that has not connected an agent
 * yet included (a learner comes here from Learn's bar): its rows say what starts when the agent connects.
 */
async function loadSummaryView(): Promise<ContributeView> {
  const view = await loadContribute();
  if (!view) contributeHidden(await loadContributeSetupState());
  return view;
}

/** Settings' "Privacy" group: who can see the person's Skills page. Nothing without a session. */
async function loadPrivacyGroup(): Promise<ReactNode> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  const mine = await loadSkillsMine(githubLogin);
  return <SkillsPrivacyGroup login={githubLogin} mine={mine} setHidden={setSkillsHiddenAction} />;
}

/** Learn's reads for its rows, each the person's own; none signed out. */
async function loadLearnRows() {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { setup: null, email: null, issues: null, lessonIssues: null };
  const [setup, email, issues, lessonIssues] = await Promise.all([
    loadLearnSetupForSettings(githubLogin),
    loadLearnEmailSettings(githubLogin),
    loadLearnIssuesEmail(githubLogin),
    loadLearnLessonIssuesEmail(githubLogin),
  ]);
  return { setup, email, issues, lessonIssues };
}

export async function SettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params, set, email, counts, jar, privacy] = await Promise.all([
    loadSummaryView(),
    searchParams,
    loadContributeSet(),
    loadContributeEmailSettings(),
    loadScheduleCounts(),
    cookies(),
    loadPrivacyGroup(),
  ]);
  // GitHub's consent comes back here when it was not saved: its answer is on GitHub's own page.
  const grant = grantRefusalOf(params.grant);
  if (grant) redirect(`${SETTINGS_PATHS.github}?grant=${grant}` as Route);
  const learn = await loadLearnRows();
  const bar = settingsBarOf({
    from: params.from,
    lastBar: lastBarOf(jar.get(LAST_BAR_COOKIE)?.value),
    audience: audienceOf(view.sides),
  });
  return (
    <SettingsScreen
      view={view}
      bar={bar}
      set={set}
      setFailed={set === undefined}
      email={email ?? null}
      emailFailed={email === undefined}
      emailHint={emailHintOf(params.email)}
      learnSetup={learn.setup ?? null}
      learnSetupFailed={learn.setup === undefined}
      learnEmail={learn.email ?? null}
      learnEmailFailed={learn.email === undefined}
      learnIssuesEmail={learn.issues}
      learnLessonIssuesEmail={learn.lessonIssues}
      openPrs={counts?.prBound}
      privacy={privacy}
    />
  );
}

/** What the user works on, in a line: the mode with a list, then the filters. */
function workValueOf(set: ContributeSet | null | undefined, view: ContributeView, setFailed: boolean): string {
  if (setFailed) return "Your lists didn't load. Reload the page to try again; everything else here works as usual.";
  const filters = preferencesSummaryOf(view.contributor?.preferences ?? null);
  return set && set.mode !== 'ALL' ? `${modeTitleOf(set.mode)} · ${filters}` : filters;
}

function ContributePreferencesGroup({
  view,
  set,
  setFailed,
}: {
  view: ContributeView;
  set: ContributeSet | null | undefined;
  setFailed: boolean;
}) {
  return (
    <SettingsGroup id="contribute-preferences" title="Contribute preferences">
      <SettingsList>
        <SettingsRow
          icon={SlidersHorizontal}
          href={SETTINGS_PATHS.work}
          cta="Edit"
          title="What you work on"
          value={workValueOf(set, view, setFailed)}
          data={{ 'data-row': 'work' }}
        />
      </SettingsList>
    </SettingsGroup>
  );
}

/**
 * The agent that does the work, GitHub's access and the sign-off: both agents', read from the stored settings always.
 * With no agent yet, the agent's row opens the connect steps.
 */
export function AgentGithubGroup({ view }: { view: ContributeView }) {
  const settings = view.contributor?.settings ?? null;
  const agent = agentSummaryOf(view);
  return (
    <SettingsGroup id="agent-github" title="Agent and GitHub">
      <SettingsList>
        <SettingsRow
          icon={Bot}
          href={agent.state === 'none' ? WORKSPACE_PATHS.agentConnect : WORKSPACE_PATHS.agent}
          cta={agent.state === 'none' ? 'Connect' : 'Edit'}
          title="AI agent"
          value={agent.value}
          data={{ 'data-row': 'agent', 'data-agent': agent.state }}
        />
        <SettingsRow
          icon={Lock}
          href={SETTINGS_PATHS.github}
          cta="Edit"
          title="GitHub access"
          value={grantSummaryOf(view.grant, view.grantAvailable)}
          data={{ 'data-row': 'github' }}
        />
        {settings ? (
          <SettingsRow
            icon={PenLine}
            href={`${SETTINGS_PATHS.pullRequests}#dco` as Route}
            cta="Edit"
            title="DCO sign-off"
            value={dcoSummaryOf(settings)}
            data={{ 'data-row': 'dco' }}
          />
        ) : null}
      </SettingsList>
    </SettingsGroup>
  );
}

/**
 * The limits on pull requests and attempts, which bind both agents: read from the stored settings always, even for an
 * account with its own agent alone (the hosted agent's settings hide behind a key on the Agent tab; these do not).
 */
function LimitsGroup({ view, openPrs }: { view: ContributeView; openPrs?: number }) {
  const settings = view.contributor?.settings ?? null;
  const limits = view.contributor?.limits;
  const override = openPrsOverrideOf(limits);
  return (
    <SettingsGroup id="pr-limits" title="Limits">
      <SettingsList>
        {settings ? (
          <>
            <SettingsRow
              icon={GitPullRequest}
              // A limit set for the account holds over the setting: said, not edited.
              href={override === null ? (`${SETTINGS_PATHS.pullRequests}#open` as Route) : undefined}
              cta="Edit"
              title="Open pull requests at a time"
              value={`${openPrsSummaryOf(settings, limits, openPrs)}${override === null ? '' : ' · Set for your account by GitRanks.'}`}
              data={{ 'data-row': 'open' }}
            />
            <SettingsRow
              icon={Layers}
              href={`${SETTINGS_PATHS.pullRequests}#attempts` as Route}
              cta="Edit"
              title="Attempts at a time"
              value={attemptsSummaryOf(settings, limits)}
              data={{ 'data-row': 'attempts' }}
            />
            <SettingsRow
              icon={FileDiff}
              href={`${SETTINGS_PATHS.pullRequests}#size` as Route}
              cta="Edit"
              title="Pull request size"
              value={prSizeSummaryOf(settings)}
              data={{ 'data-row': 'size' }}
            />
          </>
        ) : (
          <li className="px-4 py-3.5 text-sm text-muted-foreground" data-row="not-yet">
            These start when your agent connects: how many pull requests are open at a time, how many issues are in work
            at once, the size of a pull request, and the sign-off.
          </li>
        )}
      </SettingsList>
      <ReposAskLessNote
        className="px-1"
        text="Repos can ask for less: their rules lower these limits for their pull requests."
      />
    </SettingsGroup>
  );
}

/**
 * Settings: one page for both products, opened from either bar, with the product's own preferences first.
 * From Learn: Learn preferences, Email, Agent and GitHub, Limits, then Contribute preferences; from Contribute:
 * Contribute preferences, Agent and GitHub, Limits, Email, then Learn preferences. Privacy, then Delete all data,
 * last. A product's group shows only to someone who uses it (Learn's, to everyone; Contribute's, to all but
 * someone who only learns). In Email, Learn's "Lessons to repeat" and "New issues for you" come first from Learn and
 * after Contribute's rows from Contribute; the time zone is last. Each row opens the page it is changed on; the Email
 * rows change on the page itself. Old links to a section go on to where it is now (`SettingsAnchors`).
 */
export function SettingsScreen({
  view,
  bar = 'contribute',
  set,
  setFailed = false,
  email = null,
  emailFailed = false,
  emailHint = null,
  learnSetup = null,
  learnSetupFailed = false,
  learnEmail = null,
  learnEmailFailed = false,
  learnIssuesEmail = null,
  learnLessonIssuesEmail = null,
  openPrs,
  privacy = null,
}: {
  view: ContributeView;
  /** The bar the page shows, whose product's groups come first. */
  bar?: ProductBar;
  /** What the user works on; null when the API hides it, `undefined` when it did not load. */
  set?: ContributeSet | null;
  /** What the user works on did not load. */
  setFailed?: boolean;
  /** The Email rows; null when the API hides them. */
  email?: ContributeEmailSettings | null;
  /** The Email rows did not load: the group says so. */
  emailFailed?: boolean;
  /** The choice an email's "instead" link offers (`?email=`): the group asks before switching. */
  emailHint?: ContributeNeedsYouEmail | null;
  /** Learn's setup: null when there is none. */
  learnSetup?: LearnSetupRead | null;
  /** Learn's setup did not load: its row says so. */
  learnSetupFailed?: boolean;
  /** Learn's email settings: null when there are none. */
  learnEmail?: LearnEmailSettings | null;
  /** Learn's email settings did not load: a line in Email says so. */
  learnEmailFailed?: boolean;
  /** "A new issue for you": its row is drawn only when this read answered. */
  learnIssuesEmail?: LearnIssuesEmailSetting | null;
  /** "Issues for my lessons": its row is drawn only when this read answered. */
  learnLessonIssuesEmail?: LearnLessonIssuesSetting | null;
  /** The pull requests that count against the limit now. */
  openPrs?: number;
  /** The group "Privacy": who can see the person's Skills page. */
  privacy?: ReactNode;
}) {
  const audience = audienceOf(view.sides);
  const fromLearn = bar === 'learn';
  const contribute =
    audience === 'learner' ? null : <ContributePreferencesGroup view={view} set={set} setFailed={setFailed} />;
  const learn = <LearnPreferencesGroup setup={learnSetupFailed ? undefined : learnSetup} />;

  // Learn's rows of Email: the switch where its product's rows go, the time zone last.
  let lessons: ReactNode = null;
  let zone: ReactNode = null;
  if (learnEmail) {
    const noAddress = !!email && !email.to;
    lessons = (
      <>
        <LessonsToRepeatRow on={learnEmail.lessonsToRepeat} noAddress={noAddress} />
        {learnIssuesEmail ? <NewIssuesRow setting={learnIssuesEmail} noAddress={noAddress} /> : null}
        {learnLessonIssuesEmail ? <LessonIssuesRow on={learnLessonIssuesEmail.on} noAddress={noAddress} /> : null}
      </>
    );
    zone = <TimeZoneRow settings={learnEmail} savedZone={email ? email.timeZone : undefined} />;
  } else if (learnEmailFailed) {
    zone = <LearnEmailFailedRow />;
  }
  const emailGroup =
    email || emailFailed || lessons || zone ? (
      <EmailRows
        settings={emailFailed ? undefined : email}
        autopilotOn={autopilotOnOf(view.contributor)}
        hint={emailHint}
        lead={fromLearn ? lessons : null}
        tail={
          <>
            {fromLearn ? null : lessons}
            {zone}
          </>
        }
        zoneRow={!!learnEmail}
      />
    ) : null;
  const shared = (
    <>
      <AgentGithubGroup view={view} />
      <LimitsGroup view={view} openPrs={openPrs} />
    </>
  );

  return (
    <>
      <PageTitle title="Settings" />
      {fromLearn ? (
        <>
          {learn}
          {emailGroup}
          {shared}
          {contribute}
        </>
      ) : (
        <>
          {contribute}
          {shared}
          {emailGroup}
          {learn}
        </>
      )}
      {privacy}
      <DeleteDataSection hasKey={!!claudeKeyOf(view)} />
      <SettingsAnchors />
    </>
  );
}
