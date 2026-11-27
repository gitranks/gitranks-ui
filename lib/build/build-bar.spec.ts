import { describe, expect, it } from 'vitest';

import { buildBarPlaceOf, buildBarViewOf, VISITOR_BUILD_BAR } from './build-bar';

describe("Build's bar: what it draws", () => {
  it('gives a visitor, a person Build is closed to and a failed read Home and Projects, nothing on the right', () => {
    expect(buildBarViewOf(null)).toEqual(VISITOR_BUILD_BAR);
    expect(buildBarViewOf(undefined)).toEqual({ tabs: ['home', 'projects'], tests: null });
  });

  it('adds My builds and Settings for a person with a build', () => {
    expect(buildBarViewOf({ hasBuild: false, tests: null }).tabs).toEqual(['home', 'projects']);
    expect(buildBarViewOf({ hasBuild: true, tests: null }).tabs).toEqual(['home', 'projects', 'mine', 'settings']);
  });

  it('counts the tests that wait, and never shows a zero', () => {
    expect(buildBarViewOf({ hasBuild: true, tests: 2 }).tests).toBe(2);
    expect(buildBarViewOf({ hasBuild: true, tests: 1 }).tests).toBe(1);
    expect(buildBarViewOf({ hasBuild: true, tests: 0 }).tests).toBeNull();
    expect(buildBarViewOf({ hasBuild: true, tests: -1 }).tests).toBeNull();
    expect(buildBarViewOf({ hasBuild: true, tests: Number.NaN }).tests).toBeNull();
    expect(buildBarViewOf({ hasBuild: true, tests: 2.7 }).tests).toBe(2);
  });
});

describe("Build's bar: the current tab", () => {
  it('marks Home on Build’s home and on "How Build works"', () => {
    expect(buildBarPlaceOf('/build')).toBe('home');
    expect(buildBarPlaceOf('/build/')).toBe('home');
    expect(buildBarPlaceOf('/build/about')).toBe('home');
  });

  it('marks Projects on the list and on a project, My builds on My builds', () => {
    expect(buildBarPlaceOf('/build/projects')).toBe('projects');
    expect(buildBarPlaceOf('/build/mcp-server')).toBe('projects');
    expect(buildBarPlaceOf('/build/mine')).toBe('mine');
  });

  it('marks nothing on a step, a test, the start flow, or an address that cannot be read', () => {
    expect(buildBarPlaceOf('/build/mcp-server/list-the-tools')).toBeNull();
    expect(buildBarPlaceOf('/build/mcp-server/test')).toBeNull();
    expect(buildBarPlaceOf('/build/start')).toBeNull();
    expect(buildBarPlaceOf('/build/test')).toBeNull();
    expect(buildBarPlaceOf('/build/%E0%A4%A')).toBeNull();
  });

  it('marks Settings on Settings and the Agent page only when Build opened them', () => {
    expect(buildBarPlaceOf('/my/settings', 'build')).toBe('settings');
    expect(buildBarPlaceOf('/my/agent', 'build')).toBe('settings');
    expect(buildBarPlaceOf('/my/settings')).toBeNull();
    expect(buildBarPlaceOf('/my/settings', 'learn')).toBeNull();
    expect(buildBarPlaceOf('/learn', 'build')).toBeNull();
  });
});
