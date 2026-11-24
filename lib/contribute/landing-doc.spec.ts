import { describe, expect, it } from 'vitest';

import type { AgentPageStats } from './agent-page.types';
import { LANDING_HERO, LANDING_STEPS, LANDING_WAYS, LANDING_WAYS_HEAD } from './landing-copy';
import { contributeLandingDocOf } from './landing-doc';

const STATS: AgentPageStats = { readyIssues: 2792, repos: 1291, languages: [], checkedAt: '2026-11-24T12:05:55Z' };

describe('/contribute.md', () => {
  const doc = contributeLandingDocOf(STATS);

  it("says what Contribute is in the landing's own words, with the day's numbers", () => {
    expect(doc).toMatch(/^# GitRanks Contribute\n\n> Fix real open-source issues with the AI you already pay for\n/);
    expect(doc).toContain(LANDING_HERO.lead);
    expect(doc).toContain(LANDING_HERO.terms);
    expect(doc).toContain('2,792 issues ready in 1,291 repositories, checked at 12:05 UTC.');
  });

  it('lists the two ways with their facts, and the steps in order', () => {
    expect(doc).toContain(`## ${LANDING_WAYS_HEAD.title}`);
    for (const way of LANDING_WAYS) {
      expect(doc).toContain(`### ${way.title}\n\n${way.who}. ${way.text}`);
      for (const [term, detail] of way.facts) expect(doc).toContain(`- ${term}: ${detail}\n`);
    }
    expect(doc).toContain('1. Issues worth your time (we pick): From active repos');
    expect(doc).toContain(`${LANDING_STEPS.length}. You see it here (maintainers reply): Reviews and comments`);
  });

  it('points an agent at the page for AI agents', () => {
    expect(doc).toContain(
      'An AI agent connects over MCP: everything it needs is on the page for AI agents, https://gitranks.com/contribute/agents.md',
    );
    expect(doc).toContain('- For AI agents: https://gitranks.com/contribute/agents.md\n');
  });

  it('leaves the numbers out when they are not there or cannot be drawn', () => {
    expect(contributeLandingDocOf(null)).not.toContain('issues ready in');
    const broken = contributeLandingDocOf({ readyIssues: null } as unknown as AgentPageStats);
    expect(broken).not.toContain('issues ready in');
    expect(broken).toContain('## From an issue to a merged pull request');
  });
});
