import { describe, expect, it } from 'vitest';

import { buildInPart, buildInProgress, buildTestLeft, keyValueDatabaseInProgress } from './__fixtures__/builds';
import {
  sideAgentConnected,
  sideAllBuilt,
  sideBuilder,
  sideGoldOpen,
  sideNoBuild,
  sideNone,
  sideNothingWaits,
  sideTestFailed,
  sideTestGoing,
  sideTestWaits,
  sideTwoOfOne,
} from './__fixtures__/home';
import { mcpServerStep } from './__fixtures__/project';
import { BUILD_FIXTURE_NOW, buildProjectsFew, codingAgentCard } from './__fixtures__/projects';
import { endTestOpen } from './__fixtures__/test';
import { dayWords, hasBuildOf, homeViewOf, lastStepWords, stepOfBuild, VISITOR_HOME } from './home';

const projects = buildProjectsFew;

describe("Build's home", () => {
  it("is a visitor's landing when nothing was read", () => {
    expect(homeViewOf(null, projects)).toEqual(VISITOR_HOME);
    expect(homeViewOf(sideNone, projects)).toEqual(VISITOR_HOME);
  });

  it('is the landing for a person with no build; "Pick a project" once an agent connected', () => {
    expect(hasBuildOf(sideNoBuild)).toBe(false);
    expect(homeViewOf(sideNoBuild, projects)).toEqual({ kind: 'landing', agentConnected: false });
    expect(homeViewOf(sideAgentConnected, projects)).toEqual({ kind: 'landing', agentConnected: true });
  });

  it('puts the build touched last in the box, the others below', () => {
    const view = homeViewOf(sideBuilder, projects);
    expect(view.kind).toBe('home');
    if (view.kind !== 'home') return;
    expect(view.box).toEqual({ kind: 'build', build: buildInProgress, step: mcpServerStep(9), of: 16 });
    expect(view.others).toEqual([keyValueDatabaseInProgress]);
    expect(view.next.map((card) => card.slug)).toEqual(['coding-agent', 'interpreter']);
  });

  it('puts a test before a build in progress, and lists every build in progress below it', () => {
    const view = homeViewOf(sideTestWaits, projects);
    if (view.kind !== 'home') throw new Error('home expected');
    expect(view.box.kind).toBe('test');
    expect(view.others).toEqual([keyValueDatabaseInProgress]);
  });

  it('says where the waiting test stands when it was read: a run in progress, or a failed try', () => {
    const boxOf = (side: typeof sideTestWaits) => {
      const view = homeViewOf(side, projects);
      return view.kind === 'home' && view.box.kind === 'test' ? view.box.standing : undefined;
    };
    expect(boxOf(sideTestWaits)).toBeNull();
    expect(boxOf(sideTestGoing)).toEqual({ kind: 'going', answered: 3, count: 10 });
    expect(boxOf(sideTestFailed)).toEqual({ kind: 'failed', right: 6, count: 10, need: 7 });
    // A test read for another project, kind or language says nothing of this one.
    expect(boxOf({ ...sideTestGoing, test: { ...endTestOpen, language: 'python' } })).toBeNull();
    expect(boxOf({ ...sideTestGoing, test: { ...endTestOpen, kind: 'gold' } })).toBeNull();
  });

  it('names the day a project was built in the gold test box, when it is known', () => {
    const view = homeViewOf(sideGoldOpen, projects);
    if (view.kind !== 'home') throw new Error('home expected');
    expect(view.box).toMatchObject({ kind: 'test', builtAt: '2026-11-12T15:00:00.000Z' });
    const unknown = homeViewOf({ ...sideGoldOpen, builds: [] }, projects);
    expect(unknown.kind === 'home' && unknown.box.kind === 'test' && unknown.box.builtAt).toBeNull();
  });

  it('keeps a home for a person whose builds are all built, from their builds alone', () => {
    expect(hasBuildOf(sideNothingWaits)).toBe(true);
    expect(homeViewOf(sideNothingWaits, projects)).toMatchObject({ kind: 'home', box: { kind: 'pick', left: 3 } });
  });

  it('says some projects are left, with no number, when the public list is not known', () => {
    expect(homeViewOf(sideNothingWaits, [])).toMatchObject({ box: { kind: 'pick', left: null } });
    expect(homeViewOf(sideAllBuilt, [])).toMatchObject({ box: { kind: 'all_built' } });
  });

  it('puts one build of a project in the box and the other below it', () => {
    const view = homeViewOf(sideTwoOfOne, projects);
    if (view.kind !== 'home') throw new Error('home expected');
    expect(view.box).toMatchObject({ kind: 'build', build: { build: 'b-mcp-ts' } });
    expect(view.others.map((build) => build.build)).toEqual(['b-mcp-py']);
  });

  it('says every project is built when none is left', () => {
    const view = homeViewOf(sideAllBuilt, projects);
    expect(view).toEqual({ kind: 'home', box: { kind: 'all_built' }, others: [], next: [] });
  });

  it('does not put a build with the test left in the box when no test is listed', () => {
    const view = homeViewOf(
      { home: { builds: [buildTestLeft], tests: [], next: [codingAgentCard] }, builds: null, agentConnected: null },
      projects,
    );
    if (view.kind !== 'home') throw new Error('home expected');
    expect(view.box.kind).toBe('pick');
    expect(view.others).toEqual([buildTestLeft]);
  });

  it("tells a part's step after the base", () => {
    expect(stepOfBuild(buildInPart)).toEqual({ step: buildInPart.partStep?.step, of: 6 });
    expect(stepOfBuild(buildTestLeft)).toBeNull();
  });
});

describe("Home's words of time", () => {
  const now = new Date(BUILD_FIXTURE_NOW);

  it('say when the last step was, and never "0 seconds"', () => {
    expect(lastStepWords('2026-11-24T12:00:00.000Z', now)).toBe('last step 2 days ago');
    expect(lastStepWords('2026-11-26T11:59:30.000Z', now)).toBe('last step just now');
    expect(lastStepWords('2026-11-26T13:00:00.000Z', now)).toBe('last step just now');
    expect(lastStepWords('not a date', now)).toBe('');
  });

  it('say when a build with no step passed was started', () => {
    expect(lastStepWords('2026-11-26T11:55:00.000Z', now, true)).toBe('started 5 minutes ago');
    expect(lastStepWords('2026-11-26T11:59:30.000Z', now, true)).toBe('started just now');
  });

  it('write a day as the boxes do', () => {
    expect(dayWords('2026-11-26T11:30:00.000Z')).toBe('26 Nov');
    expect(dayWords('')).toBe('');
    // In the zone the person's days are counted in.
    expect(dayWords('2026-11-27T02:30:00.000Z', 'America/New_York')).toBe('26 Nov');
  });
});
