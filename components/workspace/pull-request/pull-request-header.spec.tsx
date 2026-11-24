import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { agentLineOf, PullRequestHeader } from './pull-request-header';
import {
  attempts,
  detail,
  followUp,
  ownAgentAttempt,
  pullRequest,
  stopped,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW } from '@/lib/contribute/__fixtures__/contribute-views';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

const header = (props: Omit<Parameters<typeof PullRequestHeader>[0], 'now'>) =>
  renderToStaticMarkup(<PullRequestHeader now={NOW} {...props} />);

describe("the pull request's header", () => {
  it("draws a run's page with its first attempt's header", () => {
    const html = header({ attempt: followUp(), first: attempts.prOpen });
    expect(text(html)).toContain('PR #1419 ↗');
    expect(html).toContain('data-pr-state="OPEN"');
  });

  it('says the way back, the issue as chips, whose agent, the title, then where the attempt stands', () => {
    const html = header({ attempt: detail({ state: 'RUNNING', pullRequest: null }) });
    expect(text(html)).toBe(
      '← Pull requests driftwood-js/driftwood Issue #871 ↗ (opens GitHub) Hosted agent · Sonnet 5.5 Nested layouts re-render on every navigation Agent working No pull request yet: it opens when you approve',
    );
    expect(html).toContain('href="/my/pull-requests"');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/issues/871"');
    expect(html).toContain('data-stage="working"');
    expect(html).not.toContain('PR #');
  });

  it.each([
    ['REVIEW', 'Your review No pull request yet: it opens when you approve'],
    ['SUBMITTING', 'Opening…'],
  ] as const)('says the stage %s before the pull request exists', (state, words) => {
    expect(text(header({ attempt: detail({ state, pullRequest: null }) }))).toMatch(new RegExp(`${words}$`));
  });

  it('says why an attempt stopped before its pull request, a lost claim in its own words', () => {
    expect(text(header({ attempt: stopped('CLAIM_LOST') }))).toMatch(
      /Stopped The issue changed before the agent could start \(someone else took it, or it was closed\)\.$/,
    );
    expect(text(header({ attempt: stopped('NO_GO') }))).toMatch(/No-go The agent said no-go\.$/);
  });

  it('names the pull request in a chip once it exists, and says its state without repeating its number', () => {
    const html = header({ attempt: attempts.prOpen });
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(text(html)).toContain('PR #1419 ↗');
    const line = text(html.slice(html.indexOf('data-pr-state')));
    expect(line).toMatch(/^data-pr-state="OPEN"[^>]*> Open/);
    expect(line).not.toContain('#1419');
    expect(html).not.toContain('data-stage');
  });

  it('says whose agent wrote it: the hosted one and its model, or the own agent by name', () => {
    expect(agentLineOf(detail({ model: 'CLAUDE_OPUS_5_5' }))).toBe('Hosted agent · Opus 5.5');
    expect(agentLineOf(detail({ model: null }))).toBe('Hosted agent');
    expect(agentLineOf({ ...ownAgentAttempt, agent: { name: 'CLAUDE_CODE', model: 'claude-opus-5-5' } })).toBe(
      'Your own agent · Claude Code',
    );
    expect(agentLineOf({ ...ownAgentAttempt, agent: { name: 'OTHER', model: null } })).toBe('Your own agent');
    expect(agentLineOf({ ...ownAgentAttempt, agent: null })).toBe('Your own agent');
  });

  it('marks a Learn attempt with the Learn pill', () => {
    expect(text(header({ attempt: detail({ mode: 'LEARN', pullRequest: pullRequest() }) }))).toContain(
      'Issue #871 ↗ (opens GitHub) PR #1419 ↗ (opens GitHub) Learn Hosted agent',
    );
    expect(text(header({ attempt: detail({ mode: 'FIX' }) }))).not.toContain('Learn');
  });

  it('says above the way back that an attempt is an earlier one, with the way to the latest', () => {
    const latest = '/my/pull-requests/driftwood-js/driftwood/871' as Route;
    const html = header({ attempt: attempts.prOpen, earlier: { latest } });
    expect(text(html)).toMatch(/^An earlier attempt on this issue\. See the latest → ← Pull requests/);
    expect(html).toContain(`href="${latest}"`);
    expect(header({ attempt: attempts.prOpen })).not.toContain('data-earlier-attempt');
  });
});
