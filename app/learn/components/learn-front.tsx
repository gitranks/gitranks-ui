import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { LearnHomeError, LearnHomeView } from '@/components/learn/home/learn-home-view';
import { LearnLandingView } from '@/components/learn/landing/learn-landing-view';
import { loadLearnCourses } from '@/lib/learn/course.data';
import { type LearnHomeRead, learnPageOf } from '@/lib/learn/home';
import { loadLearnHome } from '@/lib/learn/home.data';
import type { LandingViewer } from '@/lib/learn/landing';
import { loadTryLessons } from '@/lib/learn/landing.data';
import { loadLearnProfile } from '@/lib/learn/learn.data';
import { hasGoal } from '@/lib/learn/learn-home';
import { loadLearnTimeZone } from '@/lib/learn/my-progress.data';
import { LEARN_HOME_PATH } from '@/lib/learn/paths';
import { loadHomeReal, loadMergedFixes } from '@/lib/learn/real-issues.data';
import { learnLandingJsonLd } from '@/lib/learn/seo/landing';
import type { LearnSetupRead } from '@/lib/learn/setup';
import { loadLearnSetup as loadLearnSetupOf } from '@/lib/learn/setup.data';
import { skillsPath } from '@/lib/skills/paths';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { WorkspaceGate } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { learnResumeOf } from '@/lib/workspace/getting-in';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';

/*
 * `/learn` and `/learn/about`, read per request. A visitor reads the landing; a signed-in person Learn home, or the
 * landing for someone who has not set up Learn and has learned no lesson.
 */

/**
 * The landing with its courses, the lessons at the top and the newest merged fixes; a read that fails leaves its part
 * out. `resume` is the step of today's flow someone stopped at.
 */
async function LoadedLanding({ viewer, resume = null }: { viewer: LandingViewer; resume?: string | null }) {
  const [courses, fixes] = await Promise.all([loadLearnCourses().catch(() => []), loadMergedFixes()]);
  const lessons = await loadTryLessons(courses);
  return (
    <>
      <JsonLd payloads={learnLandingJsonLd(courses, lessons[0]?.lesson ?? null)} />
      <LearnLandingView viewer={viewer} resume={resume} courses={courses} lessons={lessons} fixes={fixes} />
    </>
  );
}

/**
 * Where someone part-way through today's flow (a goal saved, never entered) left it: Pick an issue. Null for anyone
 * else, and when their goal cannot be read.
 */
async function resumeOf(gate: WorkspaceGate | null): Promise<string | null> {
  if (gate?.kind !== 'open' || gate.entered) return null;
  const profile = await loadLearnProfile().catch(() => null);
  return hasGoal(profile) ? learnResumeOf(true) : null;
}

/**
 * What a signed-in person has: their home, their setup, the zone their days are counted in (null:
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

/** `/learn`: the landing for a visitor and for someone not set up; Learn home for everyone else. */
export async function LearnFrontView() {
  const login = await viewerLogin();
  if (!login) return <LoadedLanding viewer="visitor" />;
  // The third box and the "Real issues" rows are read apart, beside the home: none of them (an API without them yet)
  // draws the home as before.
  const [{ home, setup, timeZone, gate, page }, real] = await Promise.all([personOf(login), loadHomeReal(login)]);
  if (page === 'landing') return <LoadedLanding viewer="member" resume={await resumeOf(gate)} />;
  if (!home) return <LearnHomeError />;
  const reads = real.issues.length ? await loadMaskedListReads().catch(() => null) : null;
  return (
    <LearnHomeView
      home={home}
      setup={setup}
      now={new Date().toISOString()}
      timeZone={timeZone}
      real={real}
      reads={reads}
      skillsHref={skillsPath(login)}
    />
  );
}

/**
 * `/learn/about`, How Learn works: the landing for a learner, with Learn's bar. A visitor or someone not set up is
 * sent to `/learn`, one address for one page.
 */
export async function LearnAboutView() {
  const login = await viewerLogin();
  if (!login) redirect(LEARN_HOME_PATH);
  const { page } = await personOf(login);
  if (page === 'landing') redirect(LEARN_HOME_PATH);
  return (
    <>
      <Suspense fallback={<LearnBar state={{ kind: 'visitor' }} place={null} />}>
        <LearnBarLive />
      </Suspense>
      <LoadedLanding viewer="learner" />
    </>
  );
}
