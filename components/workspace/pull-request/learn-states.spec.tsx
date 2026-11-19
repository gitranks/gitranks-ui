import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/my/pull-requests/driftwood-js/driftwood/871' }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/learn/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({}));
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: vi.fn(async () => true) }));
vi.mock('@/lib/learn/learn.data', () => ({}));

const { ContributionShell, ReviewScreen } = await import('./review-view');
const { LessonViewScreen } = await import('@/app/learn/components/lesson-view');
const { contributionMovesOf } = await import('@/lib/workspace/contribution-moves');
const { learnViewOf } = await import('@/lib/learn/learn-view');
const { NOW, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail, feedbackThread, followUpAttempts, pullRequest } = await import(
  '@/lib/contribute/__fixtures__/contribute-attempts'
);
const { lessons } = await import('@/lib/learn/__fixtures__/lesson');

import type { LearnAttemptLesson } from '@/lib/learn/learn.types';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/workspace/contribute.types';

const BASE = '/my/pull-requests/driftwood-js/driftwood/871' as Route;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

/** The user's own agent's Learn attempt (Claude Code), in review while the lesson is taken. */
const learn = (patch: Partial<ContributeAttemptDetail> = {}) =>
  detail({
    mode: 'LEARN',
    runner: 'MCP',
    agent: { name: 'CLAUDE_CODE', model: null },
    sendBacksLeft: 2,
    learnGatePassed: false,
    prFooter: 'footer',
    ...patch,
  });

/** A Learn pull request that is open. */
const open = (patch: Partial<ContributeAttemptDetail> = {}) =>
  learn({ state: 'PR_OPEN', learnGatePassed: true, pullRequest: pullRequest(), ...patch });

/** The Lesson view under the page's header. */
function lessonView(
  attempt: ContributeAttemptDetail,
  lesson: LearnAttemptLesson | null,
  view: ContributeView = views.active,
) {
  nav.pathname = `${BASE}/lesson`;
  return renderToStaticMarkup(
    <ContributionShell
      view={view}
      attempt={attempt}
      first={attempt}
      model={contributionMovesOf({ view, first: attempt, now: NOW })}
      lesson={lesson}
      base={BASE}
      now={NOW}
    >
      {lesson ? <LessonViewScreen view={view} attempt={attempt} lesson={lesson} base={BASE} now={NOW} /> : null}
    </ContributionShell>,
  );
}

/** The Pull request view (its next step with `next`) under the page's header. */
function prView(
  attempt: ContributeAttemptDetail,
  lesson: LearnAttemptLesson | null,
  next = false,
  view = views.active,
) {
  nav.pathname = BASE;
  return renderToStaticMarkup(
    <ReviewScreen view={view} attempt={attempt} next={next} lesson={lesson} base={BASE} now={NOW} />,
  );
}

/** The header's parts: its status line, its lesson line, and the views it offers (the one shown first). */
function headerOf(html: string) {
  const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
  const status = /data-(?:stage|pr-state)="[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(header)?.[1] ?? '';
  const lesson = /data-lesson-line="[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(header)?.[1] ?? null;
  const current = (header.match(/<a [^>]*data-view="[^"]+"[^>]*>/g) ?? []).find((tag) =>
    tag.includes('aria-current="page"'),
  );
  const shown = current ? (/data-view="([^"]+)"/.exec(current)?.[1] ?? null) : null;
  return {
    status: text(status),
    lesson: lesson === null ? null : text(lesson),
    views: header.includes('data-view-tabs'),
    shown,
  };
}

/** The main buttons of a view: one primary button at most. */
const primaries = (html: string) => (html.match(/data-variant="default"/g) ?? []).length;

const NOT_YET = 'No pull request yet: it opens after you pass the lesson';

describe('the Learn states of the pull request page (W1 §8.6)', () => {
  it('1 · the agent is working: the Lesson view says it is writing the lesson', () => {
    const html = lessonView(learn({ state: 'RUNNING' }), lessons.working);
    expect(headerOf(html)).toEqual({
      status: `Agent working ${NOT_YET}`,
      lesson: 'Lesson Being written',
      views: true,
      shown: 'lesson',
    });
    expect(text(html)).toContain('Your agent is writing your lesson');
    expect(learnViewOf('AGENT_WORKING', false)).toBe('lesson');
    expect(primaries(html)).toBe(0);
  });

  it('2 · the agent is rewriting: the same, for what was sent back', () => {
    const html = lessonView(learn({ state: 'RUNNING' }), { ...lessons.working, stage: 'AGENT_REWRITING' });
    expect(headerOf(html)).toMatchObject({ status: `Agent working ${NOT_YET}`, lesson: 'Lesson Being rewritten' });
    expect(text(html)).toContain('Your agent is working on what you sent back');
  });

  it('3 · the lesson is ready: the step, its question, Check my answer', () => {
    const html = lessonView(learn({ state: 'REVIEW' }), lessons.step);
    expect(headerOf(html)).toMatchObject({
      status: `Lesson ready ${NOT_YET}`,
      lesson: 'Lesson Step 2 of 5 · written for TypeScript, some experience',
      shown: 'lesson',
    });
    expect(text(html)).toContain('Check my answer');
    expect(learnViewOf('LESSON', false)).toBe('lesson');
  });

  it('4 · its questions need fixing: what is wrong, the send-back', () => {
    const html = lessonView(learn({ state: 'REVIEW' }), lessons.blocked);
    expect(headerOf(html)).toMatchObject({ status: `Lesson ready ${NOT_YET}`, lesson: 'Lesson Needs a fix' });
    expect(text(html)).toContain('Send back to my agent');
  });

  it('5 · the lesson passed: the summary, the changes in one line, Submit pull request', () => {
    const html = lessonView(learn({ state: 'REVIEW', learnGatePassed: true }), lessons.ready);
    expect(headerOf(html)).toMatchObject({
      status: 'Lesson passed The pull request is not open yet: read it and submit it below',
      lesson: 'Lesson Passed 5 of 5 · Oct 28',
    });
    expect(text(html)).toContain('Read the changes →');
    expect(text(html)).toContain('Submit pull request');
    expect(learnViewOf('READY_TO_APPROVE', false)).toBe('lesson');
  });

  it('6 · opening: the stepper, the page moves on by itself', () => {
    const submit = { step: 'PUSH' as const, waitUntil: null, fork: null, branch: null, lastError: null };
    const html = lessonView(learn({ state: 'SUBMITTING', learnGatePassed: true, submit }), lessons.ready);
    expect(headerOf(html).status).toBe('Opening…');
    expect(text(html)).toContain('Opening your pull request… This page moves on by itself.');
    expect(text(html)).not.toContain('Submit pull request');
  });

  it('7 · it did not open: why, and the way to try again', () => {
    const lastError = { reason: 'transient', note: 'GitHub did not answer.', at: NOW.toISOString() };
    const submit = { step: 'PUSH' as const, waitUntil: null, fork: null, branch: null, lastError };
    const html = lessonView(learn({ state: 'REVIEW', learnGatePassed: true, submit }), lessons.ready);
    expect(headerOf(html).status).toBe('Not opened The pull request did not open: see what to do below');
  });

  it("8 · waiting for the day's limit: opening tomorrow", () => {
    const submit = { step: 'WAITING_CAP' as const, waitUntil: null, fork: null, branch: null, lastError: null };
    const html = lessonView(learn({ state: 'SUBMITTING', learnGatePassed: true, submit }), lessons.ready);
    expect(headerOf(html).status).toBe('Opening tomorrow');
    expect(text(html)).toContain("It opens after 00:00 UTC: today's limit of new pull requests is reached.");
  });

  it('9 · open and waiting: the pull request line, the lesson public, Start the next lesson', () => {
    const html = prView(open(), lessons.prOpen);
    expect(headerOf(html)).toMatchObject({
      lesson: 'Lesson Passed 5 of 5 · Oct 28 · public · 14 people passed it',
      shown: 'pr',
    });
    expect(headerOf(html).status).toMatch(/^Open/);
    expect(text(html)).toContain('Waiting for the maintainers Nothing to do now.');
    expect(html).toContain('href="/learn"');
    expect(text(html)).toContain('Start the next lesson →');
    expect(text(html)).toContain('Lesson and first fix');
    expect(learnViewOf('PR_OPEN', true)).toBe('pr');
    // The Lesson view: the share links and the lesson, never the form again.
    const lesson = lessonView(open(), lessons.prOpen);
    expect(text(lesson)).toContain('Pull request #902 is open, and your lesson is public');
    expect(text(lesson)).not.toContain('Submit pull request');
  });

  it('10 · a maintainer asked for a change: the prompt for the own agent, never a run of ours', () => {
    const first = open({
      ...followUpAttempts.prNeedsYou,
      mode: 'LEARN',
      runner: 'MCP',
      agent: { name: 'CLAUDE_CODE', model: null },
      reviewFeedback: { readAt: NOW.toISOString(), threads: [feedbackThread()] },
    });
    const html = prView(first, lessons.prOpen, true);
    expect(html).toContain('data-move="learn-prompt"');
    expect(text(html)).toContain('Change 1 Your move');
    expect(text(html)).toContain(
      'Continue my GitRanks pull request https://github.com/driftwood-js/driftwood/pull/1419',
    );
    expect(text(html)).toContain('Paste this in Claude Code, in any folder');
    expect(text(html)).toContain('Read what changed, then push it');
    expect(text(html)).toContain('Reply to the maintainer ↗');
    // The hosted agent is never offered, also with a Claude key: no run to start, no note for it.
    expect(text(html)).not.toMatch(/Start run \d/);
    expect(html).not.toContain('data-move="next-run"');
    expect(text(html)).toContain('Change 1');
  });

  it('10 · with no agent connected: Connect your agent, then the prompt', () => {
    const first = open({ ...followUpAttempts.prNeedsYou, mode: 'LEARN', runner: 'MCP', agent: null });
    const noAgent = { ...views.active, ownAgent: { paths: { hosted: true, mcp: true }, tokens: [] } };
    const html = prView(first, lessons.prOpen, true, noAgent);
    expect(text(html)).toContain('Connect your agent');
    expect(html).toContain('href="/my/agent/connect"');
    expect(text(html)).toContain('Continue my GitRanks pull request');
    expect(text(html)).not.toContain('is connected');
  });

  it('11 · its agent is making the change: the session is a change, working', () => {
    const first = open({ ...followUpAttempts.quiet, mode: 'LEARN', runner: 'MCP' });
    const html = prView(first, lessons.prOpen);
    expect(text(html)).toContain('Change 1');
    expect(text(html)).toContain('Change 2');
    expect(text(html)).not.toMatch(/Run \d/);
  });

  it('14 · merged: the code is in, the next lesson, the lesson to see', () => {
    const html = prView(
      open({ state: 'MERGED', pullRequest: pullRequest({ state: 'MERGED', mergedAt: '2026-10-28T11:55:00.000Z' }) }),
      lessons.prOpen,
    );
    expect(headerOf(html).status).toMatch(/^Merged/);
    expect(text(html)).toContain(
      'Your code is in driftwood-js/driftwood. It counts toward your contribution stars. Your lesson stays public, so others can keep learning from this fix.',
    );
    expect(text(html)).toContain('Start the next lesson →');
    expect(html).toContain(`href="${BASE}/lesson"`);
  });

  it('15 · closed: the lesson stays public, Pick another issue', () => {
    const html = prView(open({ state: 'CLOSED', pullRequest: pullRequest({ state: 'CLOSED' }) }), lessons.prOpen);
    expect(text(html)).toContain('Your lesson stays public. You can take it down on the Lesson view.');
    expect(html).toContain('href="/learn#issues"');
  });

  it('16 · the attempt ended: why, no lesson line, Pick another issue', () => {
    const html = lessonView(learn({ state: 'DISCARDED', endReason: 'USER' }), lessons.ended);
    expect(headerOf(html)).toMatchObject({ status: 'Ended', lesson: null, shown: 'lesson' });
    expect(text(html)).toContain('This attempt ended');
    expect(html).toContain('href="/learn#issues"');
    expect(learnViewOf('ENDED', false)).toBe('lesson');
  });

  it('17 · opened by hand: said, the lesson to read', () => {
    const html = lessonView(learn({ state: 'REVIEW', openedBy: 'HAND' }), lessons.handPr);
    expect(headerOf(html).status).toBe('Opened by hand You opened the pull request yourself');
    expect(text(html)).toContain('You opened the pull request yourself');
  });

  it('18 · the lesson taken down, hidden or paused: the lesson line says so', () => {
    for (const [visibility, word] of [
      ['REMOVED', 'taken down'],
      ['HIDDEN', 'not available'],
      ['HELD', 'paused'],
    ] as const) {
      expect(headerOf(prView(open(), { ...lessons.prOpen, visibility })).lesson).toContain(word);
    }
  });

  it('19 · Learn closed to the account: the pull request view alone, no lesson line, no views', () => {
    const html = prView(open(), null);
    expect(headerOf(html)).toMatchObject({ lesson: null, views: false });
  });

  it('20 · the views link to the page and its lesson, the one shown marked', () => {
    const html = prView(open(), lessons.prOpen);
    const tags = html.match(/<a [^>]*data-view="[^"]+"[^>]*>/g) ?? [];
    expect(tags.find((tag) => tag.includes('data-view="pr"'))).toMatch(new RegExp(`href="${BASE}"`));
    expect(tags.find((tag) => tag.includes('data-view="pr"'))).toContain('aria-current="page"');
    expect(tags.find((tag) => tag.includes('data-view="lesson"'))).toContain(`href="${BASE}/lesson"`);
    expect(tags.find((tag) => tag.includes('data-view="lesson"'))).not.toContain('aria-current');
  });
});
