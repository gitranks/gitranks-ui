import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LearnBarFrame } from '@/components/learn/bar/learn-bar-frame';
import { LearnHomeError, LearnHomeView } from '@/components/learn/home/learn-home-view';
import { LearnLandingView } from '@/components/learn/landing/learn-landing-view';
import { loadLearnCourses } from '@/lib/learn/course.data';
import { type LearnHomeRead, learnPageOf } from '@/lib/learn/home';
import { loadLearnHome } from '@/lib/learn/home.data';
import type { LandingViewer } from '@/lib/learn/landing';
import { loadTryLessons } from '@/lib/learn/landing.data';
import { loadLearnOpen, loadLearnProfile } from '@/lib/learn/learn.data';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { learnFrontDoorOpenToVisitor } from '@/lib/learn/learn-front-door';
import { hasGoal } from '@/lib/learn/learn-home';
import { loadLearnTimeZone } from '@/lib/learn/my-progress.data';
import { LEARN_HOME_PATH } from '@/lib/learn/paths';
import { learnLandingJsonLd } from '@/lib/learn/seo/landing';
import type { LearnSetupRead } from '@/lib/learn/setup';
import { loadLearnSetup as loadLearnSetupOf } from '@/lib/learn/setup.data';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { WorkspaceGate } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { learnResumeOf } from '@/lib/workspace/getting-in';

/*
 * `/learn` and `/learn/about`, read per request. A visitor reads the landing only while Learn is open to everyone (the
 * proxy decides, and the page asks again for a session that signs nobody in); a signed-in person only when Learn is
 * open to them. Then Learn home, or the landing for someone who has not set up Learn and has learned no lesson.
 */

/**
 * The landing with its courses and the lessons at the top; a read that fails leaves its part out. Its Markdown copy is
 * linked only while it answers (Learn open to everyone); `resume` is the step of today's flow someone stopped at.
 */
async function LoadedLanding({ viewer, resume = null }: { viewer: LandingViewer; resume?: string | null }) {
  const [courses, markdown] = await Promise.all([loadLearnCourses().catch(() => []), learnOpenToEveryone(Date.now())]);
  const lessons = await loadTryLessons(courses);
  return (
    <>
      <JsonLd payloads={learnLandingJsonLd(courses, lessons[0]?.lesson ?? null)} />
      <LearnLandingView viewer={viewer} markdown={markdown} resume={resume} courses={courses} lessons={lessons} />
    </>
  );
}

/**
 * Where someone part-way through today's flow (a goal saved, never entered) left it: Pick an issue, as Learn's earlier
 * front door resumed them. Null for anyone else, and when their goal cannot be read.
 */
async function resumeOf(gate: WorkspaceGate | null): Promise<string | null> {
  if (gate?.kind !== 'open' || gate.entered) return null;
  const profile = await loadLearnProfile().catch(() => null);
  return hasGoal(profile) ? learnResumeOf(true) : null;
}

/**
 * What a signed-in person Learn is open to has: their home, their setup, the zone their days are counted in (null:
 * Learn's default, also when it cannot be read), the workspace's gate, and which page `/learn` is for them.
 */
async function personOf(login: string): Promise<{
  home: LearnHomeRead | null;
  setup: LearnSetupRead | null;
  timeZone: string | null;
  gate: WorkspaceGate | null;
  page: 'home' | 'landing';
}> {
  const [home, setup, gate, zone] = await Promise.all([
    loadLearnHome(login),
    loadLearnSetupOf(login),
    loadWorkspaceGate().catch(() => null),
    loadLearnTimeZone(login),
  ]);
  const entered = gate?.kind === 'open' && gate.entered;
  return { home, setup, timeZone: zone?.timeZone ?? null, gate, page: learnPageOf({ setup, home, entered }) };
}

/** `/learn`: the landing for a visitor and for someone not set up; Learn home for everyone else Learn is open to. */
export async function LearnFrontView() {
  const login = await viewerLogin();
  if (!login) {
    if (!(await learnFrontDoorOpenToVisitor())) notFound();
    return <LoadedLanding viewer="visitor" />;
  }
  if (!(await loadLearnOpen())) notFound();
  const { home, setup, timeZone, gate, page } = await personOf(login);
  if (page === 'landing') return <LoadedLanding viewer="member" resume={await resumeOf(gate)} />;
  if (!home) return <LearnHomeError />;
  return <LearnHomeView home={home} setup={setup} now={new Date().toISOString()} timeZone={timeZone} />;
}

/**
 * `/learn/about`, How Learn works: the landing for a learner, with Learn's bar. A visitor or someone not set up is
 * sent to `/learn`, one address for one page.
 */
export async function LearnAboutView() {
  const login = await viewerLogin();
  if (!login) redirect(LEARN_HOME_PATH);
  if (!(await loadLearnOpen())) notFound();
  const { page } = await personOf(login);
  if (page === 'landing') redirect(LEARN_HOME_PATH);
  return (
    <>
      <Suspense fallback={<LearnBar state={{ kind: 'visitor' }} place={null} />}>
        <LearnBarFrame />
      </Suspense>
      <LoadedLanding viewer="learner" />
    </>
  );
}
