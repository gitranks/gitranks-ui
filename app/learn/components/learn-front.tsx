import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { LearnHomeError, LearnHomeView } from '@/components/learn/home/learn-home-view';
import { LearnLandingView } from '@/components/learn/landing/learn-landing-view';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { loadInterviewsMyHome } from '@/lib/interviews/my-home.data';
import { loadLearnCourses } from '@/lib/learn/course.data';
import { type LearnHomeRead, learnPageOf } from '@/lib/learn/home';
import { loadLearnHome } from '@/lib/learn/home.data';
import type { LandingViewer } from '@/lib/learn/landing';
import { loadTryLessons } from '@/lib/learn/landing.data';
import { loadLearnTimeZone } from '@/lib/learn/my-progress.data';
import { LEARN_HOME_PATH } from '@/lib/learn/paths';
import { loadHomeReal, loadMergedFixes } from '@/lib/learn/real-issues.data';
import { learnLandingJsonLd } from '@/lib/learn/seo/landing';
import type { LearnSetupRead } from '@/lib/learn/setup';
import { loadLearnSetup as loadLearnSetupOf } from '@/lib/learn/setup.data';
import { skillsPath } from '@/lib/skills/paths';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';

/*
 * `/learn` and `/learn/about`, read per request. A visitor reads the landing; a signed-in person Learn home with the
 * Learn sign, the landing without it.
 */

/**
 * The landing with its courses, the lessons at the top and the newest merged fixes; a read that fails leaves its part
 * out.
 */
async function LoadedLanding({ viewer }: { viewer: LandingViewer }) {
  const [courses, fixes] = await Promise.all([loadLearnCourses().catch(() => []), loadMergedFixes()]);
  const lessons = await loadTryLessons(courses);
  return (
    <>
      <JsonLd payloads={learnLandingJsonLd(courses, lessons[0]?.lesson ?? null)} />
      <LearnLandingView viewer={viewer} courses={courses} lessons={lessons} fixes={fixes} />
    </>
  );
}

/**
 * What a signed-in person has: their home, their setup, the zone their days are counted in (null: Learn's default,
 * also when it cannot be read), and which page `/learn` is for them. The Learn sign comes with the workspace's gate: a
 * gate that is not open, or a read that failed, leaves it not known, and `learnPageOf` keeps the rule from before it.
 */
async function personOf(login: string): Promise<{
  home: LearnHomeRead | null;
  setup: LearnSetupRead | null;
  timeZone: string | null;
  page: 'home' | 'landing';
}> {
  const [home, setup, gate, zone] = await Promise.all([
    loadLearnHome(login),
    loadLearnSetupOf(login),
    loadWorkspaceGate().catch(() => null),
    loadLearnTimeZone(login),
  ]);
  const sign = gate?.kind === 'open' ? gate.signs.learn : null;
  return { home, setup, timeZone: zone?.timeZone ?? null, page: learnPageOf({ sign, setup, home }) };
}

/** `/learn`: the landing for a visitor and for someone without the Learn sign; Learn home for everyone else. */
export async function LearnFrontView() {
  const login = await viewerLogin();
  if (!login) return <LoadedLanding viewer="visitor" />;
  // The third box and the "Real issues" rows are read apart, beside the home: none of them (an API without them yet)
  // draws the home as before. The person's interview plans too, once Interviews is open to everyone: until then a
  // person it is open to reads them in the browser.
  const [{ home, setup, timeZone, page }, real, plans] = await Promise.all([
    personOf(login),
    loadHomeReal(login),
    INTERVIEWS_OPEN_TO_EVERYONE ? loadInterviewsMyHome(login) : undefined,
  ]);
  if (page === 'landing') return <LoadedLanding viewer="member" />;
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
      {...(plans !== undefined ? { plans } : {})}
    />
  );
}

/**
 * `/learn/about`, How Learn works: the landing for a learner, with Learn's bar. A visitor or someone without the sign is
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
