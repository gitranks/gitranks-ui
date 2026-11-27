import { describe, expect, it } from 'vitest';

import {
  BUILD_PROJECTS_TAG,
  buildProjectMinePath,
  buildProjectPath,
  buildProjectTag,
  buildStartMinePath,
  buildStartPath,
  buildStepMinePath,
  buildStepPath,
  buildStepTag,
  buildTestMinePath,
  buildTestPath,
  isBuildPath,
  isBuildProjectSlug,
  isBuildStepSlug,
  isBuildTag,
} from './paths';

describe("Build's addresses", () => {
  it('builds the pages of a project, a step, the start flow and the tests', () => {
    expect(buildProjectPath('mcp-server')).toBe('/build/mcp-server');
    expect(buildStepPath('mcp-server', 'list-the-tools')).toBe('/build/mcp-server/list-the-tools');
    expect(buildStartPath()).toBe('/build/start');
    expect(buildStartPath('mcp-server')).toBe('/build/start?project=mcp-server');
    expect(buildTestPath('mcp-server')).toBe('/build/mcp-server/test');
    expect(buildTestPath('mcp-server', 'gold')).toBe('/build/mcp-server/test/gold');
    expect(buildTestPath('mcp-server', 'end', 'python')).toBe('/build/mcp-server/test?language=python');
  });

  it('builds the routes the browser reads a person’s side from', () => {
    expect(buildProjectMinePath('mcp-server')).toBe('/api/me/build/projects/mcp-server');
    expect(buildStepMinePath('mcp-server', 'list-the-tools')).toBe(
      '/api/me/build/projects/mcp-server/steps/list-the-tools',
    );
    expect(buildStartMinePath()).toBe('/api/me/build/start');
    expect(buildStartMinePath('mcp-server')).toBe('/api/me/build/start?project=mcp-server');
    expect(buildTestMinePath('mcp-server', 'gold')).toBe('/api/me/build/test?project=mcp-server&kind=gold');
    expect(buildTestMinePath('mcp-server', 'end', 'typescript')).toBe(
      '/api/me/build/test?project=mcp-server&kind=end&language=typescript',
    );
  });

  it('names the cache tags the API expires', () => {
    expect(BUILD_PROJECTS_TAG).toBe('build:projects');
    expect(buildProjectTag('mcp-server')).toBe('build:project:mcp-server');
    expect(buildStepTag('mcp-server', 'list-the-tools')).toBe('build:step:mcp-server:list-the-tools');
  });
});

describe("Build's slugs and tags", () => {
  it('takes a project slug of the shape that is none of Build’s own pages', () => {
    expect(isBuildProjectSlug('mcp-server')).toBe(true);
    expect(isBuildProjectSlug('a1')).toBe(true);
    for (const slug of [
      'projects',
      'mine',
      'start',
      'about',
      'test',
      'MCP',
      'a--b',
      '-a',
      'a-',
      '',
      'a_b',
      'x'.repeat(101),
    ]) {
      expect(isBuildProjectSlug(slug)).toBe(false);
    }
  });

  it('takes a step slug of the shape that is none of a project’s tests', () => {
    expect(isBuildStepSlug('list-the-tools')).toBe(true);
    expect(isBuildStepSlug('projects')).toBe(true);
    expect(isBuildStepSlug('test')).toBe(false);
    expect(isBuildStepSlug('gold')).toBe(false);
  });

  it('knows its own tags and no others', () => {
    expect(isBuildTag('build:projects')).toBe(true);
    expect(isBuildTag('build:project:mcp-server')).toBe(true);
    expect(isBuildTag('build:step:mcp-server:list-the-tools')).toBe(true);
    for (const tag of [
      'build:steps',
      'build:project:',
      'build:project:mine',
      'build:step:mcp-server:',
      'build:step:mcp-server:gold',
      'build:step:mine:list-the-tools',
      'build:step:mcp-server:list-the-tools:x',
      'learn:courses',
    ]) {
      expect(isBuildTag(tag)).toBe(false);
    }
  });

  it('knows Build’s pages: /build and everything under it, nothing that only starts the same', () => {
    for (const path of ['/build', '/build/', '/build/projects', '/build/mcp-server/list-the-tools']) {
      expect(isBuildPath(path)).toBe(true);
    }
    for (const path of ['/buildings', '/build.md', '/api/me/build/bar', '/learn/build', '/']) {
      expect(isBuildPath(path)).toBe(false);
    }
  });
});
