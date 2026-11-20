import { describe, expect, it } from 'vitest';

import type { ContributeNeedsYouItem } from './contribute.types';
import { needsYouEntryOf, needsYouWordsOf } from './needs-you-words';
import { facts, needsYouItem, progress } from '@/lib/contribute/__fixtures__/pull-requests';

const NOW = new Date('2026-10-28T12:00:00.000Z');
const words = (over: Partial<ContributeNeedsYouItem> = {}) => needsYouWordsOf(needsYouEntryOf(needsYouItem(over)), NOW);
const page = (view: 'PAGE' | 'LESSON' | 'RUN' | 'NEXT', move: string | null = null) => ({
  kind: 'PAGE' as const,
  view,
  move,
  url: null,
  copy: null,
  target: null,
});
const github = (url: string, copy: string | null = null) => ({
  kind: 'GITHUB' as const,
  view: null,
  move: null,
  url,
  copy,
  target: null,
});
const PR_URL = 'https://github.com/kelp-db/kelp/pull/1419';

describe('the API item as the page reads it', () => {
  it('names the kind and the side as the spec does', () => {
    const entry = needsYouEntryOf(needsYouItem({ kind: 'RUN_AUTOPILOT', side: 'LEARN' }));
    expect(entry).toMatchObject({ kind: 'run-autopilot', side: 'learn' });
  });
});

describe('the buttons: where each leads, always by attempt', () => {
  it('leads to the next step, a run, the lesson or the page, the move kept', () => {
    expect(words().action).toEqual({
      label: 'Start run 2',
      href: '/my/pull-requests/by-attempt/A_KELP?session=next',
      aria: 'Start run 2 on kelp-db/kelp, pull request #1419',
    });
    expect(
      words({
        kind: 'REPLY_FAILED',
        sessionAttemptId: 'A_F1',
        action: page('RUN', 'reply-failed'),
        facts: facts({ replyTrouble: 'retry-one', drafts: 1 }),
      }).action,
    ).toMatchObject({ href: '/my/pull-requests/by-attempt/A_F1?move=reply-failed' });
    expect(words({ kind: 'LESSON_READY', side: 'LEARN', action: page('LESSON') }).action).toMatchObject({
      label: 'Take the lesson',
      href: '/my/pull-requests/by-attempt/A_KELP?view=lesson',
    });
    expect(words({ kind: 'REVIEW', action: page('PAGE') }).action).toMatchObject({
      href: '/my/pull-requests/by-attempt/A_KELP',
    });
  });

  it("leads a run's item to the run alone when it names no first attempt (replies on a pull request not listed)", () => {
    expect(
      words({
        kind: 'REPLIES',
        attemptId: null,
        sessionAttemptId: 'A_F2',
        action: page('RUN'),
        facts: facts({ drafts: 2 }),
      }).action,
    ).toMatchObject({ label: 'Approve replies', href: '/my/pull-requests/by-attempt/A_F2' });
    expect(words({ attemptId: null, sessionAttemptId: null, action: page('RUN') }).action).toBeNull();
  });

  it('opens GitHub in a new tab, copying the comment to post first', () => {
    const agreement = words({
      kind: 'AGREEMENT',
      action: github(PR_URL, 'I have read the CLA Document and I hereby sign the CLA'),
      facts: facts({
        agreement: {
          kind: 'CLA',
          check: null,
          signComment: 'I have read the CLA Document and I hereby sign the CLA',
          signUrl: null,
        },
      }),
    });
    expect(agreement.action).toEqual({
      label: 'Copy and open the PR ↗',
      external: PR_URL,
      copy: 'I have read the CLA Document and I hereby sign the CLA',
      aria: 'Copy and open the PR on kelp-db/kelp, pull request #1419 (opens GitHub)',
    });
  });

  it("leads to the Agent tab's key page for a refused key, and says the key in place of the chips", () => {
    const key = needsYouWordsOf(
      needsYouEntryOf(
        needsYouItem({
          key: 'key',
          kind: 'KEY',
          repo: null,
          issueNumber: null,
          title: null,
          pullRequest: null,
          attemptId: null,
          action: { kind: 'AGENT', view: null, move: null, url: null, copy: null, target: 'KEY' },
          facts: facts({ lastFour: 'k3Qa' }),
        }),
      ),
      NOW,
    );
    expect(key).toMatchObject({
      tone: 'red',
      pill: 'Key refused',
      move: 'Anthropic refused your Claude key, so no run can start. Connect a working key.',
      action: { label: 'Connect a new key', href: '/my/agent/key?replace=1' },
    });
  });

  it('marks the signals handled from the small second action', () => {
    const byHand = words({
      action: github(PR_URL),
      secondary: {
        kind: 'HANDLED',
        prId: 'PR_1419',
        prNumber: 1419,
        signalKinds: ['CHANGES_REQUESTED'],
        all: true,
        target: null,
      },
      facts: facts({ noRun: true, byHand: true, nextRound: 2 }),
    });
    expect(byHand).toMatchObject({
      move: 'A reviewer asked for changes. Make them on GitHub: no run adds to a pull request you opened yourself.',
      action: { label: 'Open the pull request ↗', external: PR_URL },
      secondary: {
        label: "I've done it",
        handled: { prId: 'PR_1419', prNumber: 1419, kinds: ['CHANGES_REQUESTED'], all: true },
      },
    });
  });
});

describe('the words of each kind, from its facts', () => {
  const said = (over: Partial<ContributeNeedsYouItem>) => {
    const { pill, move, action } = words(over);
    return { pill, move, label: action?.label };
  };

  it('a review, its wait, autopilot and GitHub access', () => {
    expect(said({ kind: 'REVIEW', facts: facts({ waitEndsAt: '2026-10-31T13:00:00.000Z' }) })).toEqual({
      pill: 'Ready for review',
      move: 'This pull request opens only when you approve it. Check the change, then open it or discard it. It waits 4 more days.',
      label: 'Review the change',
    });
    expect(said({ kind: 'OWN_REVIEW', facts: facts({ waitEndsAt: '2026-10-30T12:00:00.000Z' }) }).move).toBe(
      'Your agent made this. Approve it or send it back with a note. It waits 48 hours.',
    );
    expect(said({ kind: 'OWN_REVIEW', facts: facts({ waitEndsAt: '2026-10-28T17:00:00.000Z' }) }).move).toBe(
      'Your agent made this. Approve it or send it back with a note. It waits 5 more hours.',
    );
    expect(said({ kind: 'AUTOPILOT', autosubmitAt: '2026-10-28T12:42:00.000Z' })).toEqual({
      pill: 'Autopilot · 42 min',
      move: 'Autopilot opens this pull request in 42 minutes. Check it, or stop it.',
      label: 'Check before it submits',
    });
    expect(said({ kind: 'RUN_AUTOPILOT', facts: facts({ round: 2 }) }).move).toBe(
      'Autopilot pushes run 2 soon. Check it, or stop it.',
    );
    expect(said({ kind: 'GRANT' })).toEqual({
      pill: 'GitHub access',
      move: 'Allow GitHub access so the pull request opens under your account.',
      label: 'Allow GitHub access',
    });
  });

  it("the lesson's four: ready, needs fixing, passed, not opened", () => {
    const learn = { side: 'LEARN' as const, action: page('LESSON') };
    expect(said({ ...learn, kind: 'LESSON_READY' })).toEqual({
      pill: 'Lesson ready',
      move: 'Your lesson is ready. Pass it, and the pull request opens.',
      label: 'Take the lesson',
    });
    expect(said({ ...learn, kind: 'LESSON_BLOCKED' }).label).toBe('Send it back');
    expect(said({ ...learn, kind: 'LESSON_PASSED' })).toMatchObject({
      pill: 'Lesson passed',
      label: 'Submit pull request',
    });
    expect(
      said({
        ...learn,
        kind: 'LESSON_FAILED',
        facts: facts({ submitError: { reason: 'push_failed', note: 'GitHub did not let us push to your fork' } }),
      }),
    ).toEqual({
      pill: 'Not opened',
      move: 'The pull request did not open: GitHub did not let us push to your fork. See what to do, then try again.',
      label: 'Try again',
    });
  });

  it('a run ready: what it did, or what its checks say; on Learn, read what changed', () => {
    expect(said({ kind: 'RUN_READY', action: page('RUN'), facts: facts({ round: 2, fixed: 3, drafts: 2 }) })).toEqual({
      pill: 'Run 2 ready',
      move: 'Run 2 fixed 3 comments and drafted 2 replies. Approve to push and post.',
      label: 'Review run 2',
    });
    expect(said({ kind: 'RUN_READY', facts: facts({ round: 2, checkStatus: 'BLOCKED' }) }).move).toBe(
      "Our checks block run 2's push: discard it and start run 3 with a note.",
    );
    expect(said({ kind: 'RUN_READY', side: 'LEARN', facts: facts({ round: 1 }) })).toEqual({
      pill: 'Change 1 ready',
      move: 'Your agent made the change. Read what changed, then push it.',
      label: 'Read what changed',
    });
  });

  it('changes, a comment and a failing check: a run on Contribute, the own agent on Learn', () => {
    expect(said({})).toEqual({
      pill: 'Changes requested',
      move: 'A reviewer asked for changes. Start run 2 on them.',
      label: 'Start run 2',
    });
    expect(said({ side: 'LEARN' })).toEqual({
      pill: 'Changes requested',
      move: 'A maintainer asked for a change. Your agent makes it; you read it and push.',
      label: 'See what they asked',
    });
    expect(said({ kind: 'COMMENT', facts: facts({ nextRound: 3 }) }).label).toBe('Answer with run 3');
    expect(
      said({ kind: 'CHECK', facts: facts({ nextRound: 2, checks: ['lint', 'test (node 20, linux)'] }) }).move,
    ).toBe('lint, test (node 20, linux) fail on your pull request. Start run 2 to fix it.');
    expect(said({ kind: 'CHECK', side: 'LEARN', facts: facts({ checks: ['lint'] }) }).move).toBe(
      'lint fails on your pull request. Your agent fixes it; you read it and push.',
    );
  });

  it("a pull request the own agent made on Contribute: that agent's, as on Learn, never a run of ours", () => {
    expect(said({ runner: 'MCP' })).toEqual({
      pill: 'Changes requested',
      move: 'A maintainer asked for a change. Your agent makes it; you read it and push.',
      label: 'See what they asked',
    });
    expect(said({ kind: 'COMMENT', runner: 'MCP' }).move).toBe(
      'Someone commented on it. Your agent answers it; you read it and push.',
    );
    expect(said({ kind: 'CHECK', runner: 'MCP', facts: facts({ checks: ['lint'] }) }).move).toBe(
      'lint fails on your pull request. Your agent fixes it; you read it and push.',
    );
    // One no run adds to (opened by hand, a repo that said no) stays GitHub's.
    expect(said({ runner: 'MCP', facts: facts({ noRun: true, byHand: true }) }).label).toBe('Open the pull request');
    expect(said({ kind: 'OTHER', runner: 'MCP' })).toEqual({
      pill: 'Something changed',
      move: 'Something changed on it. Your agent looks at it; you read it and push.',
      label: 'See what changed',
    });
    expect(
      said({ kind: 'RUN_STOPPED', runner: 'MCP', detail: 'Ran out of budget.', facts: facts({ round: 1 }) }),
    ).toEqual({
      pill: 'Run 1 stopped',
      move: 'Run 1 stopped: Ran out of budget. Ask your agent to pick it up again, or handle it yourself.',
      label: 'See what to do',
    });
    expect(said({ kind: 'PUSH_FAILED', runner: 'MCP', facts: facts({ round: 1 }) })).toMatchObject({
      pill: 'Run 1 not pushed',
      label: 'See what to do',
    });
    expect(said({ kind: 'RUN_STOPPED', facts: facts({ round: 1, nextRound: 2 }) }).label).toBe('Try run 2');
  });

  it('the replies to approve, and those that did not post', () => {
    expect(said({ kind: 'REPLIES', facts: facts({ round: 1, drafts: 1, draftsTo: '@mo' }) })).toEqual({
      pill: 'Replies to approve',
      move: 'Run 1 drafted 1 reply to @mo. Read and post them.',
      label: 'Approve the reply',
    });
    expect(
      said({
        kind: 'REPLY_FAILED',
        detail: 'GitHub did not let GitRanks post it in its thread.',
        facts: facts({
          replyTrouble: 'one-comment-org',
          drafts: 7,
          replyRest: { same: 1, others: [{ round: 1, count: 2 }] },
        }),
      }),
    ).toEqual({
      pill: 'Replies not posted',
      move: "Your 7 replies didn't reach GitHub: kelp-db only lets apps it has approved post in review threads. Post them as one comment. 1 more reply didn't post for another reason, and 2 from run 1 wait too: open the pull request's runs.",
      label: 'Post as one comment',
    });
    expect(
      said({ kind: 'REPLY_FAILED', detail: null, facts: facts({ replyTrouble: 'comment-failed-grant', drafts: 2 }) }),
    ).toEqual({
      pill: 'Replies not posted',
      move: "Your 2 replies didn't post as one comment.",
      label: 'Allow GitHub access',
    });
  });

  it("the user's own: a conversation comment, a check only they clear, an agreement, the rules", () => {
    expect(said({ kind: 'CONVERSATION' }).label).toBe('See the comment');
    expect(said({ kind: 'CHECK_YOURS', detail: 'Add a screenshot of the new flag', action: github(PR_URL) })).toEqual({
      pill: 'Check only you can clear',
      move: 'Add a screenshot of the new flag.',
      label: 'Open the pull request ↗',
    });
    expect(
      said({
        kind: 'CLA',
        action: github('https://cla-assistant.io/kelp-db/kelp'),
        facts: facts({ agreement: { kind: 'CLA', check: 'license/cla', signComment: null, signUrl: null } }),
      }),
    ).toEqual({
      pill: 'CLA to sign',
      move: 'The repo merges code only from people who signed its CLA (its check: license/cla), and only you can sign it. Sign it on its page; this clears once the check passes.',
      label: 'Sign the CLA ↗',
    });
    expect(
      said({
        kind: 'TITLE',
        facts: facts({ ruleIssues: ['TITLE'], ruleSources: [{ kind: 'TITLE', label: 'CONTRIBUTING.md' }] }),
      }).move,
    ).toBe(
      'The repo sets a rule for pull request titles (in its CONTRIBUTING.md), and this one breaks it. Fix it in one click.',
    );
    expect(said({ kind: 'DESCRIPTION', facts: facts({ templateCheck: 'Template' }) }).label).toBe(
      'Fix the description',
    );
    expect(said({ kind: 'DESCRIPTION' }).label).toBe('Fill in the description');
    expect(said({ kind: 'CHANGELOG' }).label).toBe('Fix the changelog');
    expect(said({ kind: 'DCO' }).label).toBe('Sign off and push');
    expect(said({ kind: 'DCO', facts: facts({ byHand: true }) }).label).toBe('See how to sign off');
  });

  it('a bot, the proof, what a run left, the repo out, silence, a fix that failed, a kind not known yet', () => {
    expect(said({ kind: 'BOT', detail: 'clawsweeper: Needs changes before merge' }).move).toBe(
      'clawsweeper holds the merge until you do what it asks: "Needs changes before merge" Read what it asks.',
    );
    expect(
      said({
        kind: 'PROOF',
        facts: facts({ proofStage: 'connected', proofBot: 'clawsweeper', proofAsks: 'Add real behavior proof' }),
      }),
    ).toEqual({
      pill: 'Proof needed',
      move: 'clawsweeper asks for real behavior proof. Your own agent can capture it on your machine.',
      label: 'Get the proof',
    });
    expect(said({ kind: 'PROOF_REVIEW', facts: facts({ proofStage: 'review', proofBot: 'clawsweeper' }) }).label).toBe(
      'Check the proof',
    );
    expect(
      said({
        kind: 'PUSH_FAILED',
        detail: 'The push failed (patch_conflict)',
        facts: facts({ round: 1, nextRound: 2 }),
      }),
    ).toEqual({
      pill: 'Run 1 not pushed',
      move: "Run 1's commits could not be pushed. Start run 2 to make the change again on the pull request as it is now.",
      label: 'Try run 2',
    });
    expect(said({ kind: 'RUN_FOUND', detail: 'Only a maintainer can merge it', facts: facts({ round: 1 }) }).move).toBe(
      'Run 1 changed nothing: Only a maintainer can merge it.',
    );
    expect(said({ kind: 'REPO_OUT', facts: facts({ outReason: 'pr_misses' }) }).move).toBe(
      'This repo has left our PRs unanswered; it is out of the shared pool for 90 days. Close it on GitHub if you no longer want it, or click Keep it open.',
    );
    expect(said({ kind: 'SILENT', detail: '2026-11-05T00:00:00.000Z' }).pill).toBe('No answer in 30 days');
    expect(said({ kind: 'FIX_FAILED', facts: facts({ fix: { kind: 'TITLE', note: 'GitHub refused it' } }) }).move).toBe(
      'Retitling the pull request did not go through: GitHub refused it. Try again, or make the change on GitHub.',
    );
    expect(said({ kind: 'SOMETHING_NEW' })).toEqual({
      pill: 'Something changed',
      move: 'Something waits on it. See what on its page.',
      label: 'See what to do',
    });
  });
});

describe('the work in progress', () => {
  const said = (over: Partial<ContributeNeedsYouItem>) => {
    const { pill, move, action } = words({ working: true, action: page('PAGE'), ...over });
    return { pill, move, label: action?.label };
  };

  it("a first attempt: when it started and its spend, the user's own agent, the submission's step", () => {
    expect(said({ kind: 'ATTEMPT_WORKING', progress: progress() })).toEqual({
      pill: 'Agent working',
      move: 'Started 3 hours ago · $0.40 of $5',
      label: 'Details',
    });
    expect(
      said({
        kind: 'ATTEMPT_WORKING',
        runner: 'MCP',
        progress: progress({
          agentName: 'Claude Code',
          leaseUntil: '2026-10-28T15:00:00.000Z',
          changesRequested: true,
        }),
      }).move,
    ).toBe('Claude Code is on it · held for it for another 3 hours · sent back with your note');
    // No lease yet: the user's own agent has claimed it and checks the issue.
    expect(
      said({ kind: 'ATTEMPT_WORKING', runner: 'MCP', progress: progress({ agentName: 'Claude Code' }) }).move,
    ).toBe('Your own agent claimed it: checking the issue on GitHub.');
    expect(said({ kind: 'ATTEMPT_SUBMITTING', progress: progress({ submitStep: 'PUSH' }) }).move).toBe(
      'Pushing the change to a branch on your fork.',
    );
    expect(said({ kind: 'ATTEMPT_QUEUED', progress: progress() }).pill).toBe('Queued');
  });

  it('a run at work, a push being read, a sign-off being sent', () => {
    expect(
      said({
        kind: 'WORKING',
        action: page('RUN'),
        facts: facts({ round: 1 }),
        progress: progress({ runStep: 'fixing' }),
      }),
    ).toEqual({
      pill: 'Run 1 working',
      move: 'Fixing · started 3 hours ago. It comes back here when it is ready.',
      label: 'Watch run 1',
    });
    expect(said({ kind: 'OWN_WORKING', facts: facts({ round: 2 }), progress: progress() }).move).toBe(
      'Your agent is on it.',
    );
    expect(
      said({
        kind: 'PUSHED',
        sessionAttemptId: 'A_F1',
        facts: facts({ round: 1 }),
        progress: progress({ pushedSha: '89cc1af0d2' }),
      }).move,
    ).toBe('Pushed 89cc1af · reading the pull request again.');
    expect(words({ working: true, kind: 'SIGNING_OFF', action: null }).action).toBeNull();
  });
});
