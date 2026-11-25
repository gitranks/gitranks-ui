import { describe, expect, it } from 'vitest';

import type { AgentPageStats } from './agent-page.types';
import { LANDING_QUESTIONS } from './faq';
import {
  LANDING_BAND_TEXT,
  LANDING_DEFAULTS,
  LANDING_HERO,
  LANDING_STEPS,
  LANDING_WAYS,
  LANDING_WAYS_HEAD,
  landingStepLabelOf,
} from './landing-copy';
import { contributeLandingDocOf } from './landing-doc';

const STATS: AgentPageStats = { readyIssues: 2792, repos: 1291, languages: [], checkedAt: '2026-11-24T12:05:55Z' };

describe('/contribute.md', () => {
  const doc = contributeLandingDocOf(STATS);

  it("says what Contribute is in the landing's own words, with the day's numbers", () => {
    expect(doc).toMatch(/^# GitRanks Contribute\n\n> Fix real open-source issues with the AI you already pay for\n/);
    expect(doc).toContain(
      'We find issues maintainers want solved and match them to what you know. An AI agent writes the fix, you review it, and the pull request opens in your name.',
    );
    expect(doc).toContain(LANDING_HERO.terms);
    expect(doc).toContain('2,792 issues ready in 1,291 repositories, checked at 12:05 UTC.');
  });

  it('lists the two ways with their facts, the hosted agent first', () => {
    expect(doc).toContain(`## ${LANDING_WAYS_HEAD.title}`);
    for (const way of LANDING_WAYS) {
      expect(doc).toContain(`### ${way.title}\n\n${way.top}. ${way.text}`);
      for (const { label, value } of way.facts) expect(doc).toContain(`- ${label}: ${value}\n`);
    }
    expect(doc.indexOf('### On your Claude key')).toBeLessThan(doc.indexOf('### With your own agent'));
    expect(doc).toContain('Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity');
  });

  it('lists the four steps in order, named like the stages of a pull request', () => {
    const steps = doc.split('\n').filter((line) => /^\d\. /.test(line));
    expect(steps.map((line) => line.slice(0, line.indexOf(':')))).toEqual([
      '1. An issue worth your time (we pick)',
      '2. Your agent writes the change (fix)',
      '3. You read it and send it (approve)',
      '4. Maintainers answer (review)',
    ]);
    expect(doc).not.toMatch(/^5\. /m);
  });

  it("labels the page's steps by number and stage", () => {
    expect(LANDING_STEPS.map(({ who }, index) => landingStepLabelOf(index, who))).toEqual([
      '01 · we pick',
      '02 · fix',
      '03 · approve',
      '04 · review',
    ]);
  });

  it('lists the six defaults', () => {
    expect(doc).toContain('## Everything is set for you, and all of it is yours to change');
    expect(LANDING_DEFAULTS).toHaveLength(6);
    for (const { title, text } of LANDING_DEFAULTS) expect(doc).toContain(`- ${title}: ${text}\n`);
    expect(doc).toContain('Narrow by language or repo whenever you like.');
  });

  it("says what it promises maintainers, with the footer's two lines quoted", () => {
    expect(doc).toContain(`## Honest with maintainers\n\n${LANDING_BAND_TEXT}\n`);
    expect(doc).toContain(
      [
        '> Made with GitRanks Contribute and Claude Code (Opus) · Reviewed and submitted by @mira-dev',
        '>',
        '> Something off? Tell us or opt out in one step. Maintainers are always in control.',
      ].join('\n'),
    );
    expect(doc).toContain('For maintainers: https://gitranks.com/contribute/maintainers');
  });

  it("answers the landing's own questions, with the link to Learn", () => {
    expect(doc).toContain('## Questions');
    for (const { question, answer } of LANDING_QUESTIONS) expect(doc).toContain(`### ${question}\n\n${answer}\n`);
    expect(doc).toContain('### How is it different from GitRanks Learn?');
    expect(doc).toContain('GitRanks Learn: https://gitranks.com/learn\n');
    expect(doc).not.toContain('Is it fair to maintainers?');
  });

  it('points an agent at the page for AI agents, and leaves the live proof out', () => {
    expect(doc).toContain(
      'An AI agent connects over MCP: everything it needs is on the page for AI agents, https://gitranks.com/contribute/agents.md',
    );
    expect(doc).toContain('- For AI agents: https://gitranks.com/contribute/agents.md\n');
    expect(doc).not.toContain('Merged through GitRanks');
  });

  it('leaves the numbers out when they are not there or cannot be drawn', () => {
    expect(contributeLandingDocOf(null)).not.toContain('issues ready in');
    const broken = contributeLandingDocOf({ readyIssues: null } as unknown as AgentPageStats);
    expect(broken).not.toContain('issues ready in');
    expect(broken).toContain('## From an issue to a merged pull request');
  });
});
