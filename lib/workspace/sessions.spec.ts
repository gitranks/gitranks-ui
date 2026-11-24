import type { Route } from 'next';
import { describe, expect, it } from 'vitest';

import { pageBaseOf, waitingThreadsOf } from './sessions';
import { attempts, followUpAttempts } from '@/lib/contribute/__fixtures__/contribute-attempts';

/** The page's address the tiles link under (an earlier attempt's page passes its own). */
const PAGE = '/my/pull-requests/acme/widgets/42' as Route;

describe("a session's address, under its page's", () => {
  it("reads the page's address off the browser's path, a run's segment aside", () => {
    expect(pageBaseOf(PAGE)).toBe(PAGE);
    expect(pageBaseOf(`${PAGE}/`)).toBe(PAGE);
    expect(pageBaseOf(`${PAGE}/runs/A_F2`)).toBe(PAGE);
    expect(pageBaseOf(`${PAGE}/earlier/A_0/runs/A_F1`)).toBe(`${PAGE}/earlier/A_0`);
  });
});

describe("a contribution's sessions", () => {
  it('counts only the threads that wait, on an open pull request', () => {
    const thread = { threadId: 'T', commentId: 'C', author: 'bot', bot: true, path: null, line: null, excerpt: 'x' };
    const feedback = {
      readAt: null,
      threads: [
        { ...thread, url: null, createdAt: null, ignored: false },
        { ...thread, commentId: 'C2', url: null, createdAt: null, ignored: true },
      ],
    };
    expect(waitingThreadsOf({ ...followUpAttempts.prNeedsYou, reviewFeedback: feedback })).toHaveLength(1);
    expect(waitingThreadsOf({ ...attempts.merged, reviewFeedback: feedback })).toHaveLength(0);
  });
});
