import { describe, expect, it } from 'vitest';

import { answerAfter } from './__fixtures__/learn-question';
import { octocatAnswers, walkthrough, walkthroughParts } from './__fixtures__/walkthrough';
import { answerStartOf } from './learn-answer';
import {
  isLearnFixRemovedPath,
  learnFixAnswersByAttemptPath,
  learnFixAnswersPath,
  learnFixByAttemptOf,
  learnFixMinePath,
  learnFixRemovedPath,
  learnFixRouteOf,
  learnFixWalkthroughPath,
} from './paths';
import { learnAnswersMetadata, learnWalkthroughJsonLd, learnWalkthroughMetadata } from './seo/walkthrough';
import {
  answeredDateOf,
  callVerdictOf,
  fixAddressOf,
  fixMineOf,
  fixRefOf,
  pickedIdsOf,
  playerQuestionOf,
  rightWhyOf,
  triesSummaryOf,
  triesWordsOf,
  walkthroughAnswersOf,
  walkthroughBlockOf,
  walkthroughOf,
} from './walkthrough';

const PR = { nameWithOwner: 'acme/widgets', number: 57 };

/** The public read as the API sends it: the stored shape of a part's blocks. */
const wire = {
  repo: 'acme/widgets',
  issueNumber: 42,
  number: 57,
  title: 'Saving a widget with an empty name breaks the list',
  language: 'TypeScript',
  fixer: 'octocat',
  version: 3,
  lesson: { slug: 'validate-input', title: 'Check input at the edge', course: 'web', courseName: 'Web basics' },
  parts: [
    {
      id: 'fix',
      heading: 'The check before saving',
      blocks: [
        { type: 'text', text: 'The fix checks the name.' },
        { type: 'diff', file: 'src/save.ts', header: '@@ -1,2 +1,3 @@', lines: [' a', '+b', '-c'], mark: [1] },
        { type: 'video', url: 'x' },
      ],
      question: {
        id: 'q',
        multi: false,
        prompt: 'Why?',
        options: [
          { id: 'a', text: 'A', right: true, why: 'Because.' },
          { id: 'b', text: 'B', right: false, why: 'Not this.' },
        ],
      },
    },
  ],
};

describe('a walkthrough as its pages read it', () => {
  it('reads the public walkthrough, its blocks in either shape, a block of an unknown kind left out', () => {
    const read = walkthroughOf(wire);
    expect(read?.fixer).toBe('octocat');
    expect(read?.lesson?.slug).toBe('validate-input');
    expect(read?.parts[0].blocks.map((block) => block.type)).toEqual(['TEXT', 'DIFF']);
    const diff = read?.parts[0].blocks[1];
    expect(diff?.lines).toEqual([
      { kind: 'HUNK', text: '@@ -1,2 +1,3 @@' },
      { kind: 'CTX', text: ' a' },
      { kind: 'ADD', text: '+b' },
      { kind: 'DEL', text: '-c' },
    ]);
    // The header drawn first moves the stored marks by one.
    expect(diff?.mark).toEqual([2]);
  });

  it('reads a flat block as lessons are read', () => {
    expect(
      walkthroughBlockOf({ type: 'CODE', path: 'a.ts', fromLine: 3, toLine: 4, excerpt: 'x', repo: null })?.toLine,
    ).toBe(4);
    expect(walkthroughBlockOf({ type: 'code', path: 'a.ts', lines: [3, 4], excerpt: 'x' })?.fromLine).toBe(3);
    expect(walkthroughBlockOf({ type: 'TABLE', columns: ['a'], rows: [['1']], ring: 5 })?.ring).toBeNull();
  });

  it('is null for a read not of its shape: no parts, a question with no right option, no fixer', () => {
    expect(walkthroughOf(null)).toBeNull();
    expect(walkthroughOf({ ...wire, parts: [] })).toBeNull();
    expect(walkthroughOf({ ...wire, fixer: null })).toBeNull();
    const noKey = {
      ...wire.parts[0],
      question: {
        ...wire.parts[0].question,
        options: [wire.parts[0].question.options[1], wire.parts[0].question.options[1]],
      },
    };
    expect(walkthroughOf({ ...wire, parts: [noKey] })).toBeNull();
  });

  it("reads answers shared, kept private, and the fixer's own either way", () => {
    const shared = {
      login: 'octocat',
      passedAt: '2026-11-20T10:15:00Z',
      shared: true,
      readers: 3,
      walkthrough: wire,
      answers: [{ question: 'q', tries: 2 }],
    };
    expect(walkthroughAnswersOf(shared)?.answers).toEqual([{ question: 'q', tries: 2 }]);
    const kept = { ...shared, shared: false };
    expect(walkthroughAnswersOf(kept)).toMatchObject({ shared: false, walkthrough: null, answers: null });
    expect(walkthroughAnswersOf(kept, { own: true })?.walkthrough?.fixer).toBe('octocat');
    // Shared, but nothing to show: read as kept private.
    expect(walkthroughAnswersOf({ ...shared, walkthrough: null })?.shared).toBe(false);
    expect(walkthroughAnswersOf({ shared: true })).toBeNull();
  });

  it("reads where an address leads, and the person's side", () => {
    expect(fixAddressOf({ state: 'live', owner: 'acme', repo: 'widgets', number: 57, login: null })?.state).toBe(
      'LIVE',
    );
    expect(fixAddressOf({ state: 'GONE' })).toBeNull();
    expect(
      fixMineOf({ fixer: true, walkthroughHeld: true, passedAt: null, similar: [{ issue: { issue: { id: 'm1' } } }] }),
    ).toEqual({ fixer: true, held: true, passedAt: null, similar: 'm1' });
    // Only the fixer's own walkthrough reads as held for them.
    expect(fixMineOf({ fixer: false, walkthroughHeld: true, similar: [] })?.held).toBe(false);
    expect(fixMineOf(null)).toBeNull();
  });

  it('names a pull request only from three segments that can be one', () => {
    expect(fixRefOf('acme', 'widgets', '57')).toEqual(PR);
    expect(fixRefOf('acme', 'widgets', '057')).toBeNull();
    expect(fixRefOf('acme', 'widgets', 'x')).toBeNull();
  });
});

describe('the player', () => {
  it("asks a part's question as a pick-one or a pick-all, its options in the order given, keyed or not", () => {
    const [first, , cases] = walkthroughParts;
    const keyed = playerQuestionOf(first.question, true);
    expect(keyed.type).toBe('PICK_ONE');
    expect(keyed.content).toMatchObject({ options: [{ right: false }, { right: true }, { right: false }] });
    expect(playerQuestionOf(cases.question, false)).toMatchObject({
      type: 'PICK_ALL',
      content: { options: [{ text: 'An empty name' }, { text: 'A name of spaces' }, { text: '"Gear"' }] },
    });
  });

  it("sends a pick as the options' ids", () => {
    const options = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(pickedIdsOf(options, 1)).toEqual(['b']);
    expect(pickedIdsOf(options, [0, 2, 9])).toEqual(['a', 'c']);
  });

  it("turns the call's verdict into the card's: why, and the wrong picks crossed out", () => {
    const options = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const whys = [
      { optionId: 'a', correct: false, why: 'Not a.' },
      { optionId: 'b', correct: true, why: 'Yes b.' },
    ];
    expect(callVerdictOf(options, ['b'], true, whys)).toEqual({ right: true, why: 'Yes b.', wrong: [] });
    expect(callVerdictOf(options, ['a'], false, whys)).toEqual({ right: false, why: 'Not a.', wrong: [0] });
    // Every pick right but one missed: nothing crossed out.
    expect(callVerdictOf(options, ['b'], false, whys)).toEqual({ right: false, why: null, wrong: [] });
  });

  it('keeps a question open after a wrong pick the call graded, its pick crossed out', () => {
    const question = playerQuestionOf(walkthroughParts[0].question, false);
    const state = answerAfter(question, [
      { type: 'pick', at: 0 },
      { type: 'sending' },
      { type: 'again', verdict: { right: false, why: 'Not a.', wrong: [0] } },
    ]);
    expect(state.phase).toBe('open');
    expect(state.struck).toEqual([0]);
    expect(state.tries).toBe(1);
    expect(state.shown).toMatchObject({ right: false, why: 'Not a.' });
    expect(answerStartOf(question).phase).toBe('open');
  });

  it("shows the call's own reason with a right answer when the question has no key", () => {
    const question = playerQuestionOf(walkthroughParts[1].question, false);
    const state = answerAfter(question, [
      { type: 'pick', at: 1 },
      { type: 'sending' },
      { type: 'answered', right: true, key: null, language: null, why: 'Trimmed, nothing is left.' },
    ]);
    expect(state.phase).toBe('done');
    expect(state.shown).toMatchObject({ right: true, why: 'Trimmed, nothing is left.' });
  });
});

describe('the answers page', () => {
  it('says how many tries, never which pick', () => {
    expect(triesWordsOf(1)).toBe('on the first try');
    expect(triesWordsOf(2)).toBe('on the second try');
    expect(triesWordsOf(7)).toBe('after 7 tries');
    expect(triesSummaryOf(octocatAnswers.answers ?? [])).toBe('3 on the first try, 1 on the second');
    expect(
      triesSummaryOf([
        { question: 'a', tries: 1 },
        { question: 'b', tries: 8 },
      ]),
    ).toBe('1 on the first try, 1 after 8 tries');
  });

  it("dates an answer in plain words, and gives the right options' reasons once", () => {
    expect(answeredDateOf('2026-11-20T10:15:00.000Z')).toBe('20 Nov 2026');
    expect(answeredDateOf('soon')).toBeNull();
    expect(rightWhyOf(walkthroughParts[2].question)).toBe('Nothing is left to save. Trimmed, it is empty.');
  });
});

describe("a fix's addresses", () => {
  it('builds every address of a fix', () => {
    expect(learnFixWalkthroughPath(PR)).toBe('/learn/fixes/acme/widgets/57/walkthrough');
    expect(learnFixAnswersPath(PR, 'octocat')).toBe('/learn/fixes/acme/widgets/57/walkthrough/by/octocat');
    expect(learnFixAnswersByAttemptPath('A_1')).toBe('/learn/fixes/by-attempt/A_1/answers');
    expect(learnFixRemovedPath(PR)).toBe('/learn/fixes/_removed/acme/widgets/57');
    expect(learnFixMinePath(PR)).toBe('/api/me/learn/fixes/acme/widgets/57');
    expect(learnFixMinePath(PR, { answersOf: 'octocat' })).toBe('/api/me/learn/fixes/acme/widgets/57?answers=octocat');
  });

  it("reads the fix a walkthrough's or an answers page's address names, and nothing else", () => {
    expect(learnFixRouteOf('/learn/fixes/acme/widgets/57/walkthrough')).toEqual({ pr: PR, login: null });
    expect(learnFixRouteOf('/learn/fixes/acme/widgets/57/walkthrough/by/octocat/')).toEqual({
      pr: PR,
      login: 'octocat',
    });
    for (const path of [
      '/learn/fixes/acme/widgets/57',
      '/learn/fixes/by-attempt/A_1/answers',
      '/learn/fixes/_removed/acme/widgets/57',
      '/learn/fixes/acme/widgets/57/walkthrough/by',
    ]) {
      expect(learnFixRouteOf(path), path).toBeNull();
    }
  });

  it('calls an address of that shape naming no pull request or no login invalid, for the real 404', () => {
    for (const path of [
      '/learn/fixes/acme/widgets/057/walkthrough',
      '/learn/fixes/acme/widgets/57x/walkthrough',
      '/learn/fixes/acme/widgets/0/walkthrough',
      '/learn/fixes/acme/wid%ZZgets/57/walkthrough',
      '/learn/fixes/acme/widgets/57/walkthrough/by/-bad-',
      '/learn/fixes/acme/widgets/57/walkthrough/by/a%20b',
    ]) {
      expect(learnFixRouteOf(path), path).toBe('invalid');
    }
  });

  it("reads the footer's address by attempt, and knows a removed fix's address", () => {
    expect(learnFixByAttemptOf('/learn/fixes/by-attempt/A_1/answers')).toEqual({ attemptId: 'A_1' });
    expect(learnFixByAttemptOf('/learn/fixes/by-attempt/A_1/answers/')).toEqual({ attemptId: 'A_1' });
    expect(learnFixByAttemptOf('/learn/fixes/by-attempt/a.b/answers')).toBe('invalid');
    expect(learnFixByAttemptOf('/learn/fixes/acme/widgets/57/walkthrough')).toBeNull();
    expect(isLearnFixRemovedPath('/learn/fixes/_removed/acme/widgets/57')).toBe(true);
    expect(isLearnFixRemovedPath('/learn/fixes/_removed')).toBe(true);
    expect(isLearnFixRemovedPath('/learn/fixes/_removedx/acme')).toBe(false);
  });
});

describe("a walkthrough's search engine tags", () => {
  it('indexes the walkthrough under its own address, and not one it cannot show', () => {
    const metadata = learnWalkthroughMetadata(walkthrough);
    expect(metadata.alternates?.canonical).toBe('/learn/fixes/acme/widgets/57/walkthrough');
    expect(metadata.robots).toBeUndefined();
    expect(learnWalkthroughMetadata(null).robots).toEqual({ index: false, follow: false });
  });

  it('keeps answers out, pointing search engines at the walkthrough', () => {
    const metadata = learnAnswersMetadata(walkthrough, 'octocat');
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe('/learn/fixes/acme/widgets/57/walkthrough');
  });

  it('describes the walkthrough as a learning resource with its breadcrumbs', () => {
    const [resource, crumbs] = learnWalkthroughJsonLd(walkthrough) as Record<string, unknown>[];
    expect(resource).toMatchObject({ '@type': 'LearningResource', learningResourceType: 'Fix walkthrough' });
    expect(crumbs).toMatchObject({ '@type': 'BreadcrumbList' });
    expect(JSON.stringify(crumbs)).toContain('Check input at the edge');
  });
});
