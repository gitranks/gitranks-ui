import { describe, expect, it } from 'vitest';

import { stageLineOf } from './stage-line';
import { detail, pullRequest, stopped } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { NOW } from '@/lib/contribute/__fixtures__/contribute-views';

/** The line as it reads: the pill, then the words. */
const said = (patch: Parameters<typeof detail>[0]) => {
  const line = stageLineOf(detail(patch), NOW);
  return line ? [line.pill.label, line.text].filter(Boolean).join(' · ') : null;
};

const NOT_YET = 'No pull request yet: it opens when you approve';

describe("the pull request's status line before the pull request exists", () => {
  it.each(['QUEUED', 'CLAIMING', 'RUNNING', 'CHECKS'] as const)(
    'says an agent working while the attempt is %s',
    (state) => {
      expect(said({ state, pullRequest: null })).toBe(`Agent working · ${NOT_YET}`);
    },
  );

  it('says the review waiting, and a submit that came back as not opened', () => {
    expect(said({ state: 'REVIEW', pullRequest: null })).toBe(`Your review · ${NOT_YET}`);
    const bounced = detail({
      state: 'REVIEW',
      pullRequest: null,
      submit: {
        step: 'PUSH',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_missing', note: 'Allow access', at: NOW.toISOString() },
      },
    });
    expect(stageLineOf(bounced, NOW)).toMatchObject({ name: 'not-opened', pill: { label: 'Not opened', tone: 'red' } });
  });

  it("says when autopilot submits, and the pull request opening (today's, or tomorrow's slot)", () => {
    const at = new Date(NOW.getTime() + 40 * 60_000).toISOString();
    expect(said({ state: 'PENDING_AUTOSUBMIT', pullRequest: null, autosubmitAt: at })).toBe(
      'Autopilot · Submits in 40 minutes',
    );
    expect(said({ state: 'PENDING_AUTOSUBMIT', pullRequest: null, autosubmitAt: null })).toBe(
      'Autopilot · Submits soon',
    );
    expect(said({ state: 'SUBMITTING', pullRequest: null })).toBe('Opening…');
    expect(
      said({
        state: 'SUBMITTING',
        pullRequest: null,
        submit: { step: 'WAITING_CAP', waitUntil: null, fork: null, branch: null, lastError: null },
      }),
    ).toBe('Opening tomorrow');
  });

  it('says a lost claim, a failed submit, a no-go, a stop and a discard, with why', () => {
    expect(stageLineOf(stopped('CLAIM_LOST'), NOW)).toEqual({
      name: 'claim-lost',
      pill: { label: 'Stopped', tone: 'neutral' },
      text: 'The issue changed before the agent could start (someone else took it, or it was closed).',
    });
    expect(stageLineOf(stopped('SUBMIT_FAILED'), NOW)?.pill.label).toBe('Not opened');
    expect(stageLineOf(stopped('NO_GO'), NOW)).toMatchObject({
      name: 'no-go',
      pill: { label: 'No-go' },
      text: 'The agent said no-go.',
    });
    expect(stageLineOf(stopped('TIMEOUT'), NOW)).toMatchObject({
      pill: { label: 'Stopped' },
      text: 'Reached the two-hour limit.',
    });
    expect(stageLineOf(stopped('USER'), NOW)?.text).toBe('You discarded it.');
    expect(stageLineOf(stopped('REVIEW_EXPIRED'), NOW)?.text).toBe('It waited too long for a review.');
    expect(said({ state: 'DISCARDED', endReason: 'USER', pullRequest: null })).toBe('Discarded · You discarded it.');
  });

  it("says a Learn attempt's pull request opens after the lesson", () => {
    expect(said({ state: 'RUNNING', mode: 'LEARN', pullRequest: null })).toBe(
      'Agent working · No pull request yet: it opens after you pass the lesson',
    );
  });

  it('leaves the line to the pull request once it exists, and to nothing for a state it does not know', () => {
    expect(stageLineOf(detail({ state: 'PR_OPEN', pullRequest: pullRequest() }), NOW)).toBeNull();
    expect(stageLineOf(detail({ state: 'STOPPED', endReason: 'USER', pullRequest: pullRequest() }), NOW)).toBeNull();
    expect(stageLineOf(detail({ state: 'ARCHIVED' as never, pullRequest: null }), NOW)).toBeNull();
  });
});
