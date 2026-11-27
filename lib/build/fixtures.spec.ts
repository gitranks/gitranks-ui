import { describe, expect, it } from 'vitest';

import * as builds from './__fixtures__/builds';
import { buildInProgress, buildPythonSecond, mineFull, projectMineTwo } from './__fixtures__/builds';
import { mcpServerBase, mcpServerProject, mcpServerSdkPart } from './__fixtures__/project';
import { buildProjectsFew, buildProjectsMany, mcpServerCard } from './__fixtures__/projects';
import { listTheToolsStep } from './__fixtures__/step';
import { failedResult, passedResult, testQuestionsKeyed, testQuestionsKeyless, testRun } from './__fixtures__/test';
import { buildBarViewOf } from './build-bar';
import { isBuildProjectSlug, isBuildStepSlug } from './paths';
import type { BuildMine } from './types';
import { isKeyed, optionsOf, verdictOf } from '@/lib/workspace/learn-question';

/* The fixtures the pages are built and tested on agree with each other and with the rules, as the API's answers do. */

describe("Build's fixtures", () => {
  it('give the first project 16 base steps, numbered in order, and one part', () => {
    expect(mcpServerProject.baseSteps).toBe(16);
    expect(mcpServerBase.map((step) => step.number)).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
    expect(mcpServerProject.parts).toBe(mcpServerProject.partsFull.length);
    expect(mcpServerSdkPart.steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(buildProjectsFew[0]).toBe(mcpServerCard);
    expect(buildProjectsMany.length).toBeGreaterThan(6);
  });

  it('use only slugs a project or a step can have', () => {
    for (const card of buildProjectsMany) expect(isBuildProjectSlug(card.slug)).toBe(true);
    for (const step of [...mcpServerBase, ...mcpServerSdkPart.steps]) expect(isBuildStepSlug(step.slug)).toBe(true);
    expect(new Set(mcpServerBase.map((step) => step.slug)).size).toBe(16);
  });

  it("give step 7 its question's key, both languages and the steps around it", () => {
    expect(listTheToolsStep.step.slug).toBe('list-the-tools');
    expect(isKeyed(listTheToolsStep.question)).toBe(true);
    expect(listTheToolsStep.languages.map((side) => side.language)).toEqual(['typescript', 'python']);
    expect(listTheToolsStep.before?.number).toBe(6);
    expect(listTheToolsStep.after?.number).toBe(8);
  });

  it('give a test run without keys, and results with keys whose count of right picks is the score', () => {
    expect(testRun.questions).toHaveLength(10);
    expect(testQuestionsKeyless.every((question) => !isKeyed(question))).toBe(true);
    expect(testQuestionsKeyed.every((question) => isKeyed(question))).toBe(true);
    for (const result of [passedResult, failedResult]) {
      const right = result.items.filter((item) => verdictOf(item.question, item.pick, null)?.right).length;
      expect(right).toBe(result.right);
      expect(result.passed).toBe(result.right >= 7);
      for (const item of result.items) {
        if (item.pick !== null) expect(item.pick).toBeLessThan(optionsOf(item.question).length);
      }
    }
    expect([passedResult.right, failedResult.right]).toEqual([9, 6]);
    expect(failedResult.items.filter((item) => item.pick === null)).toHaveLength(1);
  });

  it('give every build the steps its state says are done', () => {
    const all = Object.values(builds).filter(
      (value): value is BuildMine => !!value && typeof value === 'object' && 'build' in value && 'stepsDone' in value,
    );
    expect(all.length).toBeGreaterThan(10);
    for (const build of all) {
      const card = buildProjectsMany.find((project) => project.slug === build.project.slug);
      const of = card?.baseSteps;
      expect(of, build.build).toBeDefined();
      if (build.state.kind === 'in_progress') {
        expect(build.state.of, build.build).toBe(of);
        expect(build.stepsDone, build.build).toHaveLength(build.state.step.number - 1);
      } else {
        expect(build.stepsDone, build.build).toHaveLength(of as number);
      }
      expect(new Set(build.stepsDone).size, build.build).toBe(build.stepsDone.length);
    }
  });

  it('give a person two builds of one project, touched last first, and a full My builds', () => {
    expect(projectMineTwo.builds).toEqual([buildInProgress, buildPythonSecond]);
    expect(projectMineTwo.builds[0].lastStepAt > projectMineTwo.builds[1].lastStepAt).toBe(true);
    expect(mineFull.tests).toHaveLength(2);
    expect(mineFull.inProgress.every((build) => build.state.kind === 'in_progress')).toBe(true);
    expect(mineFull.built.every((build) => build.state.kind === 'built')).toBe(true);
    expect(buildBarViewOf({ hasBuild: true, tests: mineFull.tests.length }).tests).toBe(2);
  });
});
