import { FileDiff, GitPullRequest, GraduationCap, Layers, Lock, PenLine, SlidersHorizontal } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ClosedGroupLine } from '@/components/workspace/closed-group-line';
import { PausedByYouNotice } from '@/components/workspace/paused-notice';
import { PageTitle } from '@/components/workspace/primitives';
import { ReposAskLessNote } from '@/components/workspace/pull-request/repo-rules';
import { DeleteDataSection } from '@/components/workspace/settings/delete-data-section';
import { EmailRows } from '@/components/workspace/settings/email-rows';
import { SettingsAnchors } from '@/components/workspace/settings/settings-anchors';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { modeTitleOf } from '@/lib/contribute/set-format';
import { preferencesSummaryOf } from '@/lib/contribute/work-summary';
import { loadLearnProfile } from '@/lib/learn/learn.data';
import type { LearnProfile } from '@/lib/learn/learn.types';
import { LEARN_ABOUT_PATH } from '@/lib/learn/learn-path';
import { learnProfileSummaryOf } from '@/lib/learn/profile-form';
import { openPrsOverrideOf } from '@/lib/workspace/access-limits';
import { type Audience, audienceOf } from '@/lib/workspace/audience';
import {
  loadContribute,
  loadContributeEmail,
  loadContributeSet,
  loadContributeSetup,
  loadScheduleCounts,
} from '@/lib/workspace/contribute.data';
import type { ContributeEmail, ContributeSet, ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isContributePageOpen } from '@/lib/workspace/contribute-state';
import { loadLearnOpen } from '@/lib/workspace/gate.data';
import { grantRefusalOf } from '@/lib/workspace/grant-refusal';
import { ABOUT_PATH, CONNECT_AGENT_PATH, SETTINGS_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';
import {
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
 * yet included (a learner who saved a goal comes back here): its rows say what starts when the agent connects.
 */
async function loadSummaryView(): Promise<ContributeView> {
  const view = await loadContribute();
  if (!view) contributeHidden(await loadContributeSetup());
  return view;
}

export async function SettingsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [view, params, set, email, learnOpen, counts] = await Promise.all([
    loadSummaryView(),
    searchParams,
    loadContributeSet(),
    loadContributeEmail(),
    loadLearnOpen(),
    loadScheduleCounts(),
  ]);
  // GitHub's consent comes back here when it was not saved: its answer is on GitHub's own page.
  const grant = grantRefusalOf(params.grant);
  if (grant) redirect(`${SETTINGS_PATHS.github}?grant=${grant}` as Route);
  // The goal is read only where Learn is open; a read that fails says so on its row.
  const profile = learnOpen ? await loadLearnProfile().catch(() => undefined) : null;
  return (
    <SettingsScreen
      view={view}
      learnOpen={learnOpen}
      set={set}
      setFailed={set === undefined}
      email={email}
      profile={profile ?? null}
      profileFailed={profile === undefined}
      openPrs={counts?.prBound}
    />
  );
}

const TITLE_LINE: Record<Audience, string> = {
  both: 'How your pull requests go out and how we reach you, then what you work on and what you want to learn.',
  contributor: 'How your pull requests go out and how we reach you, then what you work on.',
  learner: 'How your pull requests go out and how we reach you, then what you want to learn.',
};

/** What the user works on, in a line: the mode with a list, then the filters. */
function workValueOf(set: ContributeSet | null | undefined, view: ContributeView, setFailed: boolean): string {
  if (setFailed) return "Your lists didn't load. Reload the page to try again; everything else here works as usual.";
  const filters = preferencesSummaryOf(view.contributor?.preferences ?? null);
  return set && set.mode !== 'ALL' ? `${modeTitleOf(set.mode)} · ${filters}` : filters;
}

/**
 * The limits on pull requests and attempts, which bind both agents: read from the stored settings always, even for an
 * account with its own agent alone (the hosted agent's settings hide behind a key on the Agent tab; these do not).
 */
function PullRequestsGroup({ view, openPrs }: { view: ContributeView; openPrs?: number }) {
  const settings = view.contributor?.settings ?? null;
  const limits = view.contributor?.limits;
  const override = openPrsOverrideOf(limits);
  return (
    <SettingsGroup id="pull-requests" title="Pull requests">
      <SettingsList>
        <SettingsRow
          icon={Lock}
          href={SETTINGS_PATHS.github}
          cta="Edit"
          title="GitHub access"
          value={grantSummaryOf(view.grant, view.grantAvailable)}
        />
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
            <SettingsRow
              icon={PenLine}
              href={`${SETTINGS_PATHS.pullRequests}#dco` as Route}
              cta="Edit"
              title="DCO sign-off"
              value={dcoSummaryOf(settings)}
              data={{ 'data-row': 'dco' }}
            />
          </>
        ) : (
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-sm" data-row="not-yet">
            <span className="text-muted-foreground">
              These start when your agent connects: the size of a pull request, how many are open at a time, and the
              sign-off.
            </span>
            <Link href={CONNECT_AGENT_PATH} prefetch={false} className="font-semibold text-link hover:underline">
              Connect your agent →
            </Link>
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

function ContributingGroup({
  view,
  set,
  setFailed,
}: {
  view: ContributeView;
  set: ContributeSet | null | undefined;
  setFailed: boolean;
}) {
  return (
    <SettingsGroup
      id="for-contributing"
      size="section"
      title="For contributing"
      text="For developers who want merged pull requests."
    >
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

function LearningGroup({ profile, failed }: { profile: LearnProfile | null; failed: boolean }) {
  return (
    <SettingsGroup
      id="for-learning"
      size="section"
      title="For learning"
      text="For people who want to learn from real fixes."
    >
      <SettingsList>
        <SettingsRow
          icon={GraduationCap}
          href={SETTINGS_PATHS.goal}
          cta="Edit"
          title="Goal and level"
          value={
            failed
              ? "Your goal didn't load. Reload the page to try again."
              : (learnProfileSummaryOf(profile) ?? 'Not set yet: pick what you want to learn.')
          }
          data={{ 'data-row': 'goal' }}
        />
      </SettingsList>
    </SettingsGroup>
  );
}

/**
 * Settings (W1 §10): tell GitRanks about you, once. The pull request limits and GitHub's access (both agents'), the
 * email, then each side's group, the one the person uses first, the other closed to a line; Delete last. With Learn not
 * open to the account, no Learn group at all. Each row opens the page it is changed on; the email's switch is on its
 * row. Old links to a section of the one-page Settings go on to where it is now (`SettingsAnchors`).
 */
export function SettingsScreen({
  view,
  learnOpen = false,
  set,
  setFailed = false,
  email = null,
  profile = null,
  profileFailed = false,
  openPrs,
}: {
  view: ContributeView;
  learnOpen?: boolean;
  /** What the user works on; null when the API hides it, `undefined` when it did not load. */
  set?: ContributeSet | null;
  /** What the user works on did not load. */
  setFailed?: boolean;
  /** Contribute's email; its group is left out only when the API does not answer it. */
  email?: ContributeEmail | null;
  /** Learn's goal and level: null when none is saved. */
  profile?: LearnProfile | null;
  /** The goal did not load. */
  profileFailed?: boolean;
  /** The pull requests that count against the limit now. */
  openPrs?: number;
}) {
  const audience = audienceOf(view.sides, learnOpen);
  const contributing = <ContributingGroup view={view} set={set} setFailed={setFailed} />;
  const learning = <LearningGroup profile={profile} failed={profileFailed} />;
  const closedContributing = (
    <ClosedGroupLine
      id="for-contributing"
      title="For contributing"
      text="· not set up. Contribute sends pull requests without a lesson."
      link={{ href: ABOUT_PATH, label: 'How Contribute works' }}
    />
  );
  const closedLearning = (
    <ClosedGroupLine
      id="for-learning"
      title="For learning"
      text="· not set up. Learn teaches you a real fix before the pull request opens."
      link={{ href: LEARN_ABOUT_PATH, label: 'How Learn works' }}
    />
  );

  return (
    <>
      <PageTitle title="Settings" text={TITLE_LINE[audience]} />
      <PullRequestsGroup view={view} openPrs={openPrs} />
      {/* Old links (the agents' "resume it at …", autopilot's emails) still land here: Resume while the user's own pause
          holds, and where the rest went, for all. */}
      <PausedByYouNotice view={view} />
      <p className="-mt-3 px-1 text-sm text-muted-foreground" data-agent-line="">
        Autopilot and the hosted agent with its key and budget are on the{' '}
        <Link href={WORKSPACE_PATHS.agent} prefetch={false} className="font-semibold text-link hover:underline">
          Agent tab
        </Link>
        .
      </p>
      {email ? <EmailRows email={email} /> : null}
      <div className="flex flex-col gap-8 border-t pt-8">
        {audience === 'learner' ? (
          <>
            {learning}
            {closedContributing}
          </>
        ) : (
          <>
            {contributing}
            {/* Learn's group only where Learn is open: closed for a contributor who has not started it. */}
            {learnOpen ? (audience === 'both' ? learning : closedLearning) : null}
          </>
        )}
      </div>
      <DeleteDataSection hasKey={!!claudeKeyOf(view)} learnOpen={learnOpen} />
      <SettingsAnchors />
    </>
  );
}
