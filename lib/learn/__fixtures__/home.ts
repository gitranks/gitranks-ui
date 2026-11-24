import type { MyLearnAttempt } from '../learn.types';

/** The viewer's own Learn attempt on driftwood-js/driftwood#934, at a stage. */
export const myAttempt = (patch: Partial<MyLearnAttempt> = {}): MyLearnAttempt => ({
  attemptId: 'A_1',
  stage: 'AGENT_WORKING',
  state: 'RUNNING',
  repo: 'driftwood-js/driftwood',
  issueNumber: 934,
  issueUrl: 'https://github.com/driftwood-js/driftwood/issues/934',
  title: 'Route params lose their type after a redirect',
  latestEvent: { state: 'RUNNING', detail: 'claimed', at: '2026-10-28T11:56:00.000Z' },
  prUrl: null,
  prOpenedAt: null,
  prState: null,
  resultUrl: null,
  lessonMinutes: null,
  ...patch,
});
