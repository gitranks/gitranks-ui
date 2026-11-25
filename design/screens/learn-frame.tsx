import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { LEARN_SETUP_NO_PROFILE_SCREEN } from './getting-in';
import { LEARN_COURSE_SCREEN, LEARN_COURSES_SCREEN } from './learn-courses';
import { LEARN_GONE_SCREEN } from './learn-gone';
import { LEARN_LESSON_SCREEN } from './learn-lesson';
import { LEARN_PLAYER_SCREEN } from './learn-player';
import { MY_PROGRESS_SOURCES, MyProgressStates } from './learn-progress';
import { LEARN_QUESTION_SCREEN } from './learn-question';
import { LEARN_SHARE_SCREEN } from './learn-share';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { OnboardingHow, OnboardingLanguages } from '@/components/learn/setup/setup-onboarding';
import { SetupFailed, type SetupNotice, SetupView, SetupVisitor } from '@/components/learn/setup/setup-parts';
import {
  type LearnBarFixture,
  learnBarPhoneRows,
  learnBarRows,
  learnSetupTabRows,
} from '@/lib/learn/__fixtures__/learn-bar';
import { setupForms } from '@/lib/learn/__fixtures__/setup';
import type { LearnBarState } from '@/lib/learn/learn-bar';
import { onboardingLineOf } from '@/lib/learn/onboarding';
import type { SetupForm } from '@/lib/learn/setup';

const noop = () => {};

/** One row of the board: its title above the bar in a rounded frame. */
function Row({ row, width }: { row: LearnBarFixture; width?: number }) {
  return (
    <div className="flex flex-col gap-2" style={width ? { width } : undefined}>
      <span className="text-sm font-semibold">{row.title}</span>
      <div className="overflow-hidden rounded-xl border bg-background pt-2.5" style={width ? { width } : undefined}>
        <LearnBar state={row.state} place={row.place} />
      </div>
    </div>
  );
}

/** A section of the board: its title, then its rows. */
function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="m-0 text-xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** The bar above Set up Learn: its tab the current place, or a learner's bar once the setup was saved before. */
const SETUP_BAR: LearnBarState = {
  kind: 'setup',
  setup: 'guessed',
  due: 0,
  pullRequests: false,
  pullRequestsNeedYou: 0,
};
const SAVED_BAR: LearnBarState = { kind: 'learner', due: 0, pullRequests: false, pullRequestsNeedYou: 0 };

/** One state of Set up Learn: its name, then the bar and the page, cut at `height`. */
function SetupFrame({
  title,
  height,
  form,
  notice = null,
  hints = true,
  width,
  bar,
  children,
}: {
  title: string;
  height: number;
  form?: SetupForm;
  notice?: SetupNotice | null;
  hints?: boolean;
  width?: number;
  /** The bar above a page with no form: a visitor's for one who is not signed in. */
  bar?: LearnBarState;
  children?: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2" style={width ? { width } : undefined}>
      <span className="text-sm font-semibold">{title}</span>
      <div className="overflow-hidden rounded-xl border bg-background pt-2.5" style={{ height }}>
        <LearnBar state={bar ?? (form?.source === 'saved' ? SAVED_BAR : SETUP_BAR)} place="setup" />
        {form ? (
          <SetupView form={form} hints={hints} notice={notice} onPick={noop} onSave={noop} onSignIn={noop} />
        ) : (
          children
        )}
      </div>
    </section>
  );
}

const PAGE_HEIGHT = 980;

/** One state of Learn's onboarding: its name, then the bar (no "Set up Learn" item: the page is it) and the step. */
function OnboardingFrame({
  title,
  height,
  width,
  children,
}: {
  title: string;
  height: number;
  width?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2" style={width ? { width } : undefined}>
      <span className="text-sm font-semibold">{title}</span>
      <div className="overflow-hidden rounded-xl border bg-background pt-2.5" style={{ height }}>
        <LearnBar state={SETUP_BAR} place="setup" />
        {children}
      </div>
    </section>
  );
}

const ONBOARDING_HEIGHT = 640;

/** Learn's onboarding, each step in each of its states. */
function OnboardingStates() {
  return (
    <>
      <div className="grid items-start gap-6" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <OnboardingFrame title="1 · How Learn works, opened from Learn" height={ONBOARDING_HEIGHT}>
          <OnboardingHow line={null} hints onContinue={noop} />
        </OnboardingFrame>
        <OnboardingFrame title="2 · From a lesson, with the visitor's answer kept" height={ONBOARDING_HEIGHT}>
          <OnboardingHow
            line={onboardingLineOf('/learn/lessons/hash-maps', true)}
            lineMayGrow
            hints
            onContinue={noop}
          />
        </OnboardingFrame>
        <OnboardingFrame title="3 · From a lesson, no answer kept" height={ONBOARDING_HEIGHT}>
          <OnboardingHow
            line={onboardingLineOf('/learn/lessons/hash-maps', false)}
            lineMayGrow
            hints
            onContinue={noop}
          />
        </OnboardingFrame>
        <OnboardingFrame title="4 · From a Learn issue" height={ONBOARDING_HEIGHT}>
          <OnboardingHow line={onboardingLineOf('/my/issues/q7k2m9xa?from=learn', false)} hints onContinue={noop} />
        </OnboardingFrame>
        <OnboardingFrame title="5 · Your languages: our guess ticked" height={ONBOARDING_HEIGHT}>
          <OnboardingLanguages ticked={['python', 'go']} hints onTick={noop} onSave={noop} />
        </OnboardingFrame>
        <OnboardingFrame title="6 · Nothing ticked: Save and start is off" height={ONBOARDING_HEIGHT}>
          <OnboardingLanguages ticked={[]} hints onTick={noop} onSave={noop} />
        </OnboardingFrame>
        <OnboardingFrame title="7 · The setup on its way" height={ONBOARDING_HEIGHT}>
          <OnboardingLanguages ticked={[]} pending hints onTick={noop} onSave={noop} />
        </OnboardingFrame>
        <OnboardingFrame title="8 · A save that failed: the ticks stay" height={ONBOARDING_HEIGHT}>
          <OnboardingLanguages
            ticked={['go']}
            notice={{ kind: 'error', error: 'FAILED' }}
            hints
            onTick={noop}
            onSave={noop}
          />
        </OnboardingFrame>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <OnboardingFrame title="On a phone: How Learn works, from a lesson" height={760} width={390}>
          <OnboardingHow
            line={onboardingLineOf('/learn/lessons/hash-maps', true)}
            lineMayGrow
            hints={false}
            onContinue={noop}
          />
        </OnboardingFrame>
        <OnboardingFrame title="On a phone: Your languages" height={760} width={390}>
          <OnboardingLanguages ticked={['python', 'go']} hints={false} onTick={noop} onSave={noop} />
        </OnboardingFrame>
      </div>
    </>
  );
}

/** Learn's frame: the parts every Learn page is built in. */
export const LEARN_FRAME_SCREENS: Screen[] = [
  {
    id: 'learn-bars',
    title: 'Learn’s bar, Set up Learn, and My progress',
    area: 'learn',
    route: '/learn/courses',
    sources: [
      'components/learn/bar/learn-bar.tsx',
      'components/learn/bar/learn-bar-live.tsx',
      'components/tabs/tabs-bar.tsx',
      'components/tabs/bar-item.tsx',
      'lib/learn/learn-bar.ts',
      'app/(learn)/layout.tsx',
      'components/learn/setup/setup-parts.tsx',
      'components/learn/setup/setup-live.tsx',
      'components/learn/setup/setup-onboarding.tsx',
      'lib/learn/onboarding.ts',
      'lib/learn/setup.ts',
      'app/(learn)/learn/setup/page.tsx',
      ...MY_PROGRESS_SOURCES,
    ],
    states: [
      {
        id: 'bars',
        title: 'The bar, the “Set up Learn” tab, Set up Learn, and My progress, in every state',
        path: '/learn',
        height: 19090,
        render: () => (
          <main className="mx-auto flex w-full flex-col gap-11 px-4 pt-8 pb-16" style={{ maxWidth: 1340 }}>
            <Part title="Learn’s bar (page 7)">
              {learnBarRows.map((row) => (
                <Row key={row.title} row={row} />
              ))}
              <div className="flex flex-wrap items-start gap-6">
                {learnBarPhoneRows.map((row) => (
                  <Row key={row.title} row={row} width={390} />
                ))}
              </div>
            </Part>
            <Part title="The “Set up Learn” tab, in every state (page 5)">
              {learnSetupTabRows.map((row) => (
                <Row key={row.title} row={row} />
              ))}
            </Part>
            <Part title="Set up Learn: the editor, for a person with the Learn sign, in every state (page 5)">
              <div className="grid items-start gap-6" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                {setupForms.map(({ title, form }) => (
                  <SetupFrame key={title} title={title} height={PAGE_HEIGHT} form={form} />
                ))}
                <SetupFrame
                  title="10 · Saved with a field still empty: what it needs"
                  height={PAGE_HEIGHT}
                  form={setupForms[1].form}
                  notice={{ kind: 'missing', fields: ['mainLanguage', 'level'] }}
                />
                <SetupFrame
                  title="11 · A save that failed: the choices stay"
                  height={PAGE_HEIGHT}
                  form={setupForms[0].form}
                  notice={{ kind: 'error', error: 'FAILED' }}
                />
                <SetupFrame
                  title="12 · The session ended on the way: sign in, then save"
                  height={PAGE_HEIGHT}
                  form={setupForms[0].form}
                  notice={{ kind: 'error', error: 'SIGNED_OUT' }}
                />
                <SetupFrame
                  title="13 · Saved before, after a change: saved in place"
                  height={PAGE_HEIGHT}
                  form={setupForms[7].form}
                  notice={{ kind: 'saved' }}
                />
                <SetupFrame title="14 · Not signed in" height={320} bar={{ kind: 'visitor' }}>
                  <SetupVisitor onSignIn={noop} />
                </SetupFrame>
                <SetupFrame title="15 · The session ended while the page was up" height={320} bar={{ kind: 'visitor' }}>
                  <SetupVisitor ended onSignIn={noop} />
                </SetupFrame>
                <SetupFrame title="16 · The setup did not load" height={320}>
                  <SetupFailed onReload={noop} />
                </SetupFrame>
              </div>
              <div className="flex flex-wrap items-start gap-6">
                <SetupFrame
                  title="On a phone: our guess is ready"
                  height={1060}
                  width={390}
                  form={setupForms[0].form}
                  hints={false}
                />
              </div>
            </Part>
            <Part title="My progress, in every state (page 18)">
              <MyProgressStates />
            </Part>
          </main>
        ),
      },
      {
        id: 'onboarding',
        title: 'Learn’s onboarding at /learn/setup, for a person without the Learn sign, in every state',
        path: '/learn/setup',
        height: 3700,
        render: () => (
          <main className="mx-auto flex w-full flex-col gap-11 px-4 pt-8 pb-16" style={{ maxWidth: 1340 }}>
            <Part title="Learn’s onboarding: How Learn works, then Your languages">
              <OnboardingStates />
            </Part>
          </main>
        ),
      },
    ],
  },
  LEARN_SETUP_NO_PROFILE_SCREEN,
  LEARN_QUESTION_SCREEN,
  LEARN_PLAYER_SCREEN,
  LEARN_LESSON_SCREEN,
  LEARN_GONE_SCREEN,
  LEARN_SHARE_SCREEN,
  LEARN_COURSES_SCREEN,
  LEARN_COURSE_SCREEN,
];
