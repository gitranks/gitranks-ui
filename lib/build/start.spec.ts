import { describe, expect, it } from 'vitest';

import { codingAgentCard, interpreterCard, mcpServerCard } from './__fixtures__/projects';
import {
  startConnected,
  startedBuild,
  startFresh,
  startProjects,
  startStarted,
  startStartedPython,
  startTestLeft,
} from './__fixtures__/start';
import {
  BUILD_AGENT_VARIANT,
  BUILD_START_LATE_MS,
  BUILD_START_METADATA,
  backToProjectOf,
  buildSayOf,
  buildStartStageOf,
  connectedTitleOf,
  mergeBuildStart,
  projectOfAddress,
  projectRowMetaOf,
  sayIntroOf,
  startedTextOf,
  stripStepOf,
} from './start';

describe("the start flow's words", () => {
  it('give the sentence to say from the thing a project builds', () => {
    expect(buildSayOf(mcpServerCard)).toBe('Teach me how to build an MCP server with GitRanks');
    expect(buildSayOf(codingAgentCard)).toBe('Teach me how to build a coding agent with GitRanks');
    expect(backToProjectOf(mcpServerCard)).toBe('Back to Build an MCP server');
  });

  it('name the agent when the page knows it, and any agent when it does not', () => {
    expect(connectedTitleOf('Claude Code')).toBe('Claude Code is connected');
    expect(connectedTitleOf(null)).toBe('Your agent is connected');
    expect(sayIntroOf('Claude Code')).toBe(
      'Say this in Claude Code. It asks which language and which folder, checks that the language runs on your machine, and starts with step 1.',
    );
    expect(sayIntroOf(null)).toMatch(/^Say this in your agent\. /);
  });

  it('give each row its level, its steps and its time, as the boards do', () => {
    expect(projectRowMetaOf(mcpServerCard)).toBe('Easy · 16 steps · about an hour and a half');
    expect(projectRowMetaOf(codingAgentCard)).toBe('Medium · 18 steps · about two hours');
    expect(projectRowMetaOf(interpreterCard)).toBe('Medium · 20 steps · about two hours');
  });

  it('never draw a count of nothing in a row', () => {
    expect(projectRowMetaOf({ level: 3, baseSteps: 0, minutes: 0 })).toBe('Hard');
    expect(projectRowMetaOf({ level: 1, baseSteps: 1, minutes: 20 })).toBe('Easy · 1 step · about half an hour');
  });

  it('say where the started build stands, in its language', () => {
    expect(startedTextOf(startedBuild)).toBe(
      'Build an MCP server, in TypeScript. Your agent is on step 1 of 16. Go on there: it brings in each step, and you try it.',
    );
    expect(startStartedPython.build && startedTextOf(startStartedPython.build)).toMatch(
      /^Build an MCP server, in Python\./,
    );
    expect(startTestLeft.build && startedTextOf(startTestLeft.build)).toBe(
      'Build an MCP server, in TypeScript. Go on there: it brings in each step, and you try it.',
    );
  });

  it("give the shared connect steps Build's own words and the late line after 10 minutes", () => {
    expect(BUILD_START_LATE_MS).toBe(600_000);
    expect(BUILD_AGENT_VARIANT.intro).toBe('Once per computer. Your agent works with the plan you already have.');
    expect(BUILD_AGENT_VARIANT.about('Claude Code')).toMatch(
      /^Claude Code signs in to GitRanks with your GitHub account, .* Disconnect it any time on the Agent page\.$/,
    );
    expect(BUILD_AGENT_VARIANT.late.title('Claude Code')).toBe('Claude Code has not called GitRanks after 10 minutes.');
    expect(BUILD_AGENT_VARIANT.late.text('claude-code', 'unused')).toBe(
      'Check that it is running, type /mcp in it and see that gitranks is listed, then choose Authenticate. This page moves on by itself when the call comes.',
    );
    expect(BUILD_AGENT_VARIANT.late.text('codex', 'Run codex mcp login gitranks again.')).toBe(
      'Check that it is running. Run codex mcp login gitranks again. This page moves on by itself when the call comes.',
    );
  });

  it('keep the page out of search engines', () => {
    expect(BUILD_START_METADATA.robots).toEqual({ index: false, follow: false });
  });
});

describe("the start flow's place", () => {
  it('asks a visitor to sign in first, whatever else is known', () => {
    expect(buildStartStageOf({ signedIn: false, start: null, connectedHere: false })).toBe('sign_in');
  });

  it('starts at the agent, and lands on the project for someone whose agent connected before', () => {
    expect(buildStartStageOf({ signedIn: true, start: startFresh, connectedHere: false })).toBe('agent');
    expect(buildStartStageOf({ signedIn: true, start: null, connectedHere: false })).toBe('agent');
    expect(buildStartStageOf({ signedIn: true, start: startConnected, connectedHere: false })).toBe('project');
    expect(buildStartStageOf({ signedIn: true, start: startFresh, connectedHere: true })).toBe('project');
  });

  it('says the build has started once there is one', () => {
    expect(buildStartStageOf({ signedIn: true, start: startStarted, connectedHere: false })).toBe('started');
  });

  it('marks the step at the top: the agent, the project, then both done', () => {
    expect(stripStepOf('sign_in')).toBe(1);
    expect(stripStepOf('agent')).toBe(1);
    expect(stripStepOf('project')).toBe(2);
    expect(stripStepOf('started')).toBe(3);
  });

  it('never moves back on a state read again', () => {
    expect(mergeBuildStart(startFresh, null)).toBe(startFresh);
    expect(mergeBuildStart(null, startConnected)).toEqual(startConnected);
    expect(mergeBuildStart(startConnected, startFresh)).toEqual(startConnected);
    expect(mergeBuildStart(startConnected, startStarted)).toEqual(startStarted);
    expect(mergeBuildStart(startStarted, startConnected)).toEqual(startStarted);
  });

  it('finds the project the address names among the live ones only', () => {
    expect(projectOfAddress(startProjects, 'mcp-server')).toBe(mcpServerCard);
    expect(projectOfAddress(startProjects, 'not-a-project')).toBeNull();
    expect(projectOfAddress(startProjects, null)).toBeNull();
  });
});
