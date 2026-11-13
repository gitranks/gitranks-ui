import { describe, expect, it } from 'vitest';

import { lessonPage, PUBLIC_HEAD, result, stub } from './__fixtures__/shared';
import type { LessonPage } from './learn.types';
import {
  githubLoginOf,
  isLessonResultPath,
  lessonResultJsonRouteOf,
  lessonResultPath,
  lessonSlugOf,
  reactionParamOf,
} from './learn-path';
import {
  askedByStepOf,
  isAuthorOf,
  passesShown,
  publicAnswerOf,
  resultFactsOf,
  resultFiguresOf,
  resultRowsOf,
  stubTextOf,
} from './lesson-public';
import { lessonPageMetadata, lessonResultMetadata } from './lesson-seo';

describe('the result addresses', () => {
  it('writes a result page and knows it, exactly', () => {
    expect(lessonResultPath('route-cache-miss-8f3k', 'octocat')).toBe(
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat',
    );
    expect(isLessonResultPath('/learn/lessons/route-cache-miss-8f3k/passes/octocat')).toBe(true);
    for (const path of [
      '/learn/lessons/route-cache-miss-8f3k',
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat/',
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat.json',
      '/learn/lessons/-x/passes/octocat',
      '/learn/lessons/x/passes/-octocat',
      `/learn/lessons/x/passes/${'a'.repeat(40)}`,
    ]) {
      expect(isLessonResultPath(path), path).toBe(false);
    }
  });

  it('sends the .json form of a result page to its route handler, and nothing else', () => {
    expect(lessonResultJsonRouteOf('/learn/lessons/route-cache-miss-8f3k/passes/octocat.json')).toBe(
      '/api/learn/lessons/route-cache-miss-8f3k/passes/octocat',
    );
    for (const path of [
      '/learn/lessons/route-cache-miss-8f3k/passes/octocat',
      '/learn/lessons/route-cache-miss-8f3k.json',
      '/learn/lessons/x/passes/octo.cat.json',
      '/learn/lessons/x/passes/octocat.json/',
      '/api/learn/lessons/x/passes/octocat.json',
    ]) {
      expect(lessonResultJsonRouteOf(path), path).toBeNull();
    }
  });

  it('reads slugs, logins and ?react= by their shape alone', () => {
    expect(lessonSlugOf('route-cache-miss-8f3k')).toBe('route-cache-miss-8f3k');
    expect(lessonSlugOf('a/b')).toBeNull();
    expect(lessonSlugOf(7)).toBeNull();
    expect(githubLoginOf('Mona-Lisa')).toBe('Mona-Lisa');
    expect(githubLoginOf('mona.lisa')).toBeNull();
    expect(reactionParamOf('yes')).toBe('YES');
    expect(reactionParamOf('no')).toBe('NO');
    expect(reactionParamOf(['yes'])).toBeNull();
    expect(reactionParamOf('YES')).toBeNull();
  });
});

describe('the public reads', () => {
  it('tells a lesson from its stub, and treats anything else as missing', () => {
    expect(publicAnswerOf(lessonPage, 'LessonPage')).toEqual({ kind: 'found', value: lessonPage });
    expect(publicAnswerOf<LessonPage>(stub('REMOVED'), 'LessonPage')).toEqual({ kind: 'stub', visibility: 'REMOVED' });
    expect(publicAnswerOf<LessonPage>(null, 'LessonPage')).toBeNull();
    expect(publicAnswerOf<LessonPage>(result() as unknown as LessonPage, 'LessonPage')).toBeNull();
  });

  it('says why a stub is closed: removed by its author, hidden, or paused', () => {
    expect(stubTextOf('REMOVED').title).toBe('This lesson was removed by its author');
    expect(stubTextOf('HIDDEN').title).toBe('This lesson is not available');
    expect(stubTextOf('HELD').title).toBe('This lesson is paused');
  });

  it('shows how many passed from 2 up, the author being one', () => {
    expect(passesShown(1)).toBe(false);
    expect(passesShown(2)).toBe(true);
  });

  it("sums a result's steps, and lists them in the lesson's order", () => {
    expect(resultFiguresOf(result())).toEqual({
      passed: 5,
      total: 5,
      knew: 1,
      firstTry: 3,
      moreTries: 1,
      sameTries: 2,
      reported: 0,
    });
    const shuffled = result({ results: [...result().results].reverse() });
    expect(resultRowsOf(shuffled).map((row) => [row.stepId, row.parts, row.result.state])).toEqual([
      ['s1', 'Before', 'FIRST_TRY'],
      ['s2', 'Cause', 'TRY_N'],
      ['s3', 'The fix', 'KNEW'],
      ['s4', 'How it connects', 'FIRST_TRY'],
      ['s5', 'Deep dive', 'FIRST_TRY'],
    ]);
    expect(resultRowsOf(result({ results: [] }))[0].result).toEqual({ stepId: 's1', state: 'OPEN', tries: 0 });
  });

  it('groups the questions a run was asked by step, in the order asked', () => {
    const byStep = askedByStepOf(result().asked);
    expect(byStep.get('s2')?.map((question) => question.id)).toEqual(['q2a', 'q2b']);
    expect(byStep.has('s3')).toBe(false);
  });

  it("knows the author's own result", () => {
    expect(isAuthorOf(PUBLIC_HEAD, 'OctoCat')).toBe(true);
    expect(isAuthorOf(PUBLIC_HEAD, 'mona')).toBe(false);
  });

  it('answers the facts of a pass as JSON: who, which lesson and version, when, each step; never a pick', () => {
    const facts = resultFactsOf(result({ login: 'octo-renamed' }), 'https://gitranks.com');
    expect(facts).toEqual({
      login: 'octo-renamed',
      githubId: 583231,
      lesson: {
        slug: 'route-cache-miss-8f3k',
        title: PUBLIC_HEAD.title,
        kind: 'fix',
        url: 'https://gitranks.com/learn/lessons/route-cache-miss-8f3k',
      },
      version: 1,
      passedAt: '2026-10-28T11:21:00.000Z',
      minutes: 11,
      steps: [
        { id: 's1', title: 'Every navigation rebuilt the layouts', state: 'first_try', tries: 1 },
        { id: 's2', title: 'Two spellings of one route got two cache entries', state: 'try_n', tries: 2 },
        { id: 's3', title: 'The fix: one spelling before the lookup', state: 'knew', tries: 0 },
        { id: 's4', title: 'Who calls resolveLayouts', state: 'first_try', tries: 1 },
        { id: 's5', title: 'Map keys match strings exactly', state: 'first_try', tries: 1 },
      ],
      url: 'https://gitranks.com/learn/lessons/route-cache-miss-8f3k/passes/octo-renamed',
    });
    expect(JSON.stringify(facts)).not.toMatch(/picked|options|why|"octocat"/);
  });
});

describe('the pages’ metadata', () => {
  it('gives a lesson its title, description and preview, at its own address', () => {
    const metadata = lessonPageMetadata({ kind: 'found', value: lessonPage });
    expect(metadata.title).toBe(PUBLIC_HEAD.title);
    expect(metadata.alternates?.canonical).toBe('/learn/lessons/route-cache-miss-8f3k');
    expect(metadata.description).toContain('driftwood-js/driftwood issue #871');
    expect(metadata.openGraph).toMatchObject({ type: 'article', title: PUBLIC_HEAD.title });
    expect(metadata.robots).toBeUndefined();
  });

  it("gives a result its own title at the account's current login", () => {
    const metadata = lessonResultMetadata({ kind: 'found', value: result({ login: 'octo-renamed' }) });
    expect(metadata.title).toBe(`octo-renamed passed “${PUBLIC_HEAD.title}”`);
    expect(metadata.alternates?.canonical).toBe('/learn/lessons/route-cache-miss-8f3k/passes/octo-renamed');
    expect(metadata.description).toContain('5 of 5 steps');
  });

  it('keeps stubs and missing lessons out of search engines', () => {
    for (const answer of [{ kind: 'stub', visibility: 'REMOVED' } as const, null]) {
      expect(lessonPageMetadata(answer).robots).toEqual({ index: false, follow: false });
      expect(lessonResultMetadata(answer).robots).toEqual({ index: false, follow: false });
    }
    expect(lessonPageMetadata({ kind: 'stub', visibility: 'REMOVED' }).title).toBe(
      'This lesson was removed by its author',
    );
  });
});
