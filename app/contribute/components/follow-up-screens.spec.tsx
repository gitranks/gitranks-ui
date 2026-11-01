import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/me',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
// A marker where the page reads itself again, so the static markup shows it.
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
  loadAttempts: vi.fn(),
  loadContributions: vi.fn(),
  loadOpenPrDrafts: vi.fn(),
}));

const { ReviewScreen } = await import('./review-view');
const { ContributionsScreen } = await import('./contributions-view');
const { SettingsScreen } = await import('./settings-view');
const { ReplyDraftItem } = await import('./reply-drafts');
const { AutopilotRecord, autopilotErrorMessage } = await import('./autopilot-section');
const { NOW, views, settings: baseSettings } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { attempt, contributions, feedbackThread, flowDraft, followUpAttempts, followUps, needsYou, replyDraft } =
  await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { followUpErrorMessage, handledErrorMessage, replyRefusalOf, vetoErrorMessage } = await import(
  '@/lib/contribute/follow-up-format'
);

import type {
  ContributeAttemptDetail,
  ContributeContributions,
  ContributeReplyDraft,
  ContributeView,
} from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

/** The page of `item`; `next`: on the round not started yet. */
const review = (item: ContributeAttemptDetail, view: ContributeView = views.active, next = false) =>
  renderToStaticMarkup(<ReviewScreen view={view} attempt={item} next={next} now={NOW} />);

/** My contributions with the open pull request (`kelp-db/kelp` #1419) as `patch` makes it. */
const mine = (
  patch: Partial<ContributeContributions['items'][number]>,
  drafts: Record<string, ContributeReplyDraft[] | undefined> = {},
  attempts = [attempt({ attemptId: 'A_F1', kind: 'FOLLOW_UP', state: 'REVIEW' })],
) =>
  renderToStaticMarkup(
    <ContributionsScreen
      view={views.active}
      contributions={{
        ...contributions,
        items: contributions.items.map((item) =>
          item.attemptId === 'A_8' ? { ...item, pullRequest: { ...item.pullRequest, prId: 'PR_8' }, ...patch } : item,
        ),
      }}
      attempts={attempts}
      drafts={drafts}
      now={NOW}
    />,
  );

describe('a pull request that needs the user, on My contributions', () => {
  it('lists what happened on GitHub in plain words, with when, linking the pull request', () => {
    const html = mine({ needsYou: needsYou(), followUps: followUps() });
    const plain = text(html);

    expect(html).toContain('data-pr-needs-you="1419"');
    expect(plain).toContain('A reviewer asked for changes · 3 hours ago');
    expect(plain).toContain('Someone else commented on it · 2 hours ago');
    expect(plain).toContain('A check started failing: lint, test (ubuntu) · 1 hour ago');
    expect(html).toContain('href="https://github.com/kelp-db/kelp/pull/1419"');
    expect(plain).toContain('PR #1419 on GitHub');
    expect(html).toContain('href="/contribute/attempts/A_8"');
    expect(plain).toMatch(/Needs you · 2/);
  });

  it('offers Mark as handled under what happened, and names a CLA to sign', () => {
    const html = mine({ needsYou: needsYou(), followUps: followUps() });
    expect(html).toContain('data-mark-handled="PR_8"');
    expect(text(html)).toContain('Mark as handled');

    const cla = mine({
      needsYou: { since: NOW.toISOString(), signals: [{ kind: 'CLA', at: NOW.toISOString(), detail: 'license/cla' }] },
      followUps: followUps(),
    });
    expect(text(cla)).toContain('Sign the contributor license agreement (CLA): license/cla');
    expect(cla).toContain('aria-label="Mark pull request #1419 as handled"');
    // Only the user signs a CLA: no follow-up is offered for it alone.
    expect(cla).not.toContain('data-start-follow-up');
  });

  it('says why Mark as handled did not go through', () => {
    expect(handledErrorMessage('NOT_FOUND')).toContain('no longer yours');
    expect(handledErrorMessage('INVALID', 'the pull request is not open')).toContain('no longer open');
    expect(handledErrorMessage('INVALID', 'the pull request changed meanwhile: try again')).toContain(
      'changed just now',
    );
    expect(handledErrorMessage('INVALID', 'prId must match')).not.toContain('changed just now');
  });

  it('offers a follow-up with the rounds used and left, within the limit for one attempt', () => {
    const first = mine({ needsYou: needsYou(), followUps: followUps() });
    expect(first).toContain('data-start-follow-up="PR_8"');
    expect(first).toContain('data-rounds-left="2"');
    expect(text(first)).toContain('Follow-up round 1 of 2 · 2 left');
    expect(text(first)).toContain('within your $5 limit for one attempt');
    expect(text(first)).toContain('Start a follow-up');

    const second = text(mine({ needsYou: needsYou(), followUps: followUps({ used: 1, left: 1 }) }));
    expect(second).toContain('Follow-up round 2 of 2 · 1 left');
  });

  it('hands the pull request to the user after the last round, with no follow-up to start', () => {
    const html = mine({
      needsYou: needsYou(),
      followUps: followUps({ used: 2, left: 0, handedOff: true, handedOffAt: '2026-10-27T10:00:00.000Z' }),
    });

    expect(html).toContain('data-follow-ups="handed-off"');
    expect(text(html)).toContain('All 2 follow-up rounds are used, so this pull request is handed to you');
    expect(text(html)).toContain('Handed to you on Oct 27.');
    expect(html).not.toContain('data-start-follow-up');
  });

  it('links the follow-up under way instead of starting another', () => {
    const html = mine({ needsYou: needsYou(), followUps: followUps({ used: 1, left: 1, currentAttemptId: 'A_F1' }) });

    expect(html).toContain('data-follow-ups="under-way"');
    expect(text(html)).toContain('A follow-up is under way: round 1 of 2.');
    expect(html).toContain('href="/contribute/attempts/A_F1"');
    expect(html).not.toContain('data-start-follow-up');
  });

  it('leaves out a pull request with nothing new, and one that is not open', () => {
    expect(mine({ needsYou: null, followUps: followUps() })).not.toContain('data-pr-needs-you');
    const merged = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={{
          ...contributions,
          items: [{ ...contributions.items[0], needsYou: needsYou(), followUps: followUps() }],
        }}
        attempts={[]}
        now={NOW}
      />,
    );
    expect(merged).not.toContain('data-pr-needs-you');
  });

  it('says follow-ups are not available yet while the API does not answer them', () => {
    const html = mine({ needsYou: needsYou() });

    expect(html).toContain('data-follow-ups="unavailable"');
    expect(text(html)).toContain('Follow-ups are not available yet.');
    expect(html).not.toContain('data-start-follow-up');
    // And without the newer fields at all, the page reads as it did.
    expect(mine({})).not.toContain('data-pr-needs-you');
  });

  it('lists the replies waiting for approval beside their follow-up, even with nothing new on GitHub', () => {
    const html = mine({ needsYou: null, followUps: followUps({ used: 1, left: 1 }) }, { PR_8: [replyDraft()] });

    expect(html).toContain('data-pr-needs-you="1419"');
    expect(html).toContain('data-reply-draft="D_1"');
    expect(html).toContain('data-reply-follow-up="REVIEW"');
    expect(text(html)).toContain('Drafted by a follow-up : waiting for your review.');
  });

  it('keeps an approved reply in its row while it posts', () => {
    const html = mine(
      { needsYou: null, followUps: followUps({ used: 1, left: 1 }) },
      {
        PR_8: [replyDraft({ state: 'POSTING', updatedAt: '2026-10-28T11:59:00.000Z' })],
      },
    );

    expect(html).toContain('data-pr-needs-you="1419"');
    expect(html).toContain('data-reply-state="POSTING"');
    expect(text(html)).toContain('Posting it on GitHub.');
    expect(html).not.toContain('data-approve-reply');
  });

  it('keeps a reply posted in the last day in its row, with its link, and lets an older one go', () => {
    const posted = (postedAt: string) =>
      replyDraft({
        state: 'POSTED',
        posted: true,
        postedAt,
        url: 'https://github.com/kelp-db/kelp/pull/1419#discussion_r9',
      });

    const recent = mine(
      { needsYou: null, followUps: followUps({ used: 1, left: 1 }) },
      {
        PR_8: [posted('2026-10-28T09:00:00.000Z')],
      },
    );
    expect(recent).toContain('data-reply-state="POSTED"');
    expect(recent).toContain('href="https://github.com/kelp-db/kelp/pull/1419#discussion_r9"');
    expect(text(recent)).toContain('3 hours ago');

    const old = mine(
      { needsYou: null, followUps: followUps({ used: 1, left: 1 }) },
      {
        PR_8: [posted('2026-10-26T09:00:00.000Z')],
      },
    );
    expect(old).not.toContain('data-pr-needs-you');
    expect(old).not.toContain('data-reply-draft');
  });

  it('says when autopilot submits an attempt waiting for it, with the link to stop it', () => {
    const html = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={contributions}
        attempts={[
          attempt({ state: 'PENDING_AUTOSUBMIT', autosubmitAt: '2026-10-28T12:42:00.000Z', autopilot: true }),
          attempt({ attemptId: 'A_F2', kind: 'FOLLOW_UP', state: 'DONE' }),
        ]}
        now={NOW}
      />,
    );

    expect(text(html)).toContain('Autopilot submits it in 42 minutes, unless you stop it.');
    expect(html).toContain('href="/contribute/attempts/A_1"');
    expect(text(html)).toContain('Follow-ups pushed 1');
  });
});

describe('the follow-ups of a pull request, on its first attempt', () => {
  it('shows what needs the user under the header, and the next round as a session to open', () => {
    const html = review(followUpAttempts.prNeedsYou);
    const plain = text(html);

    expect(html).toContain('data-needs-you=""');
    expect(plain).toContain('A reviewer asked for changes · 3 hours ago');
    expect(html).toContain('data-mark-handled="PR_1"');
    expect(html).toContain('data-session="next"');
    expect(html).toContain('href="/contribute/attempts/A_1?session=next"');
    expect(plain).toContain('0 of 2 rounds used');
    // The round is started from its own session, not from the first attempt's.
    expect(html).not.toContain('data-start-follow-up');
    expect(review(followUpAttempts.prNeedsYou, views.active, true)).toContain('data-start-follow-up="PR_1"');
  });

  it('says it is handed to the user after two rounds', () => {
    const html = review(followUpAttempts.handedOff);

    expect(html).toContain('data-session="handed-off"');
    expect(text(html)).toContain('Carry the pull request on on GitHub.');
    expect(html).not.toContain('data-session="next"');
    expect(review(followUpAttempts.handedOff, views.active, true)).not.toContain('data-start-follow-up');
  });

  it('lists the follow-up running on it', () => {
    const html = review(followUpAttempts.underWay);

    expect(html).toContain('data-session="A_F1"');
    expect(html).toContain('href="/contribute/attempts/A_F1"');
    expect(html).not.toContain('data-session="next"');
  });

  it('offers no next round on a merged or closed pull request', () => {
    const merged = {
      ...followUpAttempts.prNeedsYou,
      state: 'MERGED' as const,
      needsYou: null,
      pullRequest: { ...followUpAttempts.prNeedsYou.pullRequest!, state: 'MERGED' as const },
    };
    for (const item of [
      merged,
      { ...merged, followUps: undefined },
      { ...merged, followUps: followUps({ used: 1 }) },
    ]) {
      const html = review(item, views.active, true);
      expect(html).not.toContain('data-session="next"');
      expect(html).not.toContain('data-start-follow-up');
      expect(html).not.toContain('data-needs-you');
    }
  });

  it('renders the page without the follow-up fields', () => {
    const html = review({
      ...followUpAttempts.prNeedsYou,
      needsYou: undefined,
      followUps: undefined,
      replyDrafts: undefined,
    });

    expect(html).toContain('data-session="A_1"');
    expect(html).not.toContain('data-session="next"');
    expect(text(html)).not.toContain('Reply drafts are not available yet.');
  });
});

describe('a follow-up on the review screen', () => {
  it('shows it as a follow-up of the pull request, with its new commits, checks and cost', () => {
    const html = review(followUpAttempts.review);
    const plain = text(html);

    expect(html).toContain('data-follow-up-of="1419"');
    expect(plain).toContain('A follow-up of pull request #1419');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(html).toContain('href="/contribute/attempts/A_1"');
    expect(plain).toContain('The new commits');
    expect(html).toContain('data-file="src/router/normalize-path.ts"');
    expect(html).toContain('data-check="SECRETS"');
    expect(plain).toContain('$1.12 of your $5 limit');
  });

  it('pushes its commits with no title or description to edit', () => {
    const html = review(followUpAttempts.review);

    expect(html).toContain('data-follow-up-approval="A_F1"');
    expect(text(html)).toContain('Push to pull request #1419');
    expect(text(html)).toContain('Push the commits');
    expect(html).not.toContain('data-pr-form');
    expect(html).not.toContain('name="title"');
    expect(html).not.toContain('name="body"');
    expect(html).not.toContain('data-panel="approval"');
  });

  it('finishes one with replies only', () => {
    const plain = text(review(followUpAttempts.repliesOnly));

    expect(plain).toContain('Finish this follow-up');
    expect(plain).toContain('The agent made no commits this round');
    expect(plain).toContain('Approve the replies you want posted, here or once it is finished');
    expect(plain).not.toContain('Finish it, then approve');
  });

  it('shows the push under way, without the steps of a new pull request', () => {
    const html = review(followUpAttempts.submitting);

    expect(html).toContain('data-attempt-status="SUBMITTING"');
    expect(text(html)).toContain('Pushing the fixes');
    expect(html).not.toContain('aria-label="Submission steps"');
    expect(html).not.toContain('data-follow-up-approval');
  });

  it('renders DONE as pushed to the pull request', () => {
    const html = review(followUpAttempts.done);

    expect(html).toContain('data-state="DONE"');
    expect(html).toContain('data-attempt-status="DONE"');
    expect(text(html)).toContain('Pushed to the pull request');
    expect(text(html)).toContain('The new commits are on pull request #1419');
  });

  it('says nothing was pushed when it stopped or was discarded', () => {
    expect(text(review(followUpAttempts.stopped))).toContain('Nothing was pushed to pull request #1419');
    expect(text(review(followUpAttempts.discarded))).toContain('You discarded it.');
    expect(text(review(followUpAttempts.discarded))).not.toContain('went back to the pool');
  });

  it('says the pull request it follows up is not available yet without the field', () => {
    expect(text(review({ ...followUpAttempts.review, followUpOf: undefined }))).toContain(
      'The pull request it follows up is not available yet.',
    );
  });
});

describe('the reply drafts', () => {
  const item = (draft: ContributeReplyDraft, followUp?: Parameters<typeof ReplyDraftItem>[0]['followUp']) =>
    renderToStaticMarkup(
      <ul>
        <ReplyDraftItem draft={draft} prNumber={1419} followUp={followUp} now={NOW} />
      </ul>,
    );

  it('shows a draft with its review thread, the comment it answers, the text and Approve', () => {
    const html = item(replyDraft());
    const plain = text(html);

    expect(html).toContain('data-reply-state="DRAFT"');
    expect(html).toContain('data-reply-target="RC_1"');
    expect(plain).toContain('Reply in a review thread · src/router/normalize-path.ts:3');
    expect(plain).toContain('maintainer-mo wrote: Should the root path "/" keep its slash?');
    expect(plain).toContain('Good catch: the root path keeps its slash now');
    expect(html).toContain('data-approve-reply="D_1"');
    expect(html).toContain('data-blocked="false"');
    expect(plain).toContain('Approve and post');
  });

  it('shows a top-level comment as one', () => {
    expect(text(item(replyDraft({ comment: null })))).toContain('Comment on the pull request');
  });

  it('shows posting, posted with its link, and failed with the note and Approve again', () => {
    const posting = item(replyDraft({ state: 'POSTING' }));
    expect(text(posting)).toContain('Posting it on GitHub.');
    expect(posting).not.toContain('data-approve-reply');

    const posted = item(
      replyDraft({
        state: 'POSTED',
        posted: true,
        postedAt: '2026-10-28T11:00:00.000Z',
        url: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r1',
      }),
    );
    expect(text(posted)).toContain(
      'Posted as a reply in the review thread on src/router/normalize-path.ts:3, on pull request #1419, 1 hour ago.',
    );
    expect(posted).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r1"');
    expect(posted).not.toContain('data-approve-reply');

    const failed = item(
      replyDraft({
        state: 'FAILED',
        lastError: { reason: 'no_answer', note: 'GitHub did not answer. Approve again later.', at: NOW.toISOString() },
      }),
    );
    expect(failed).toContain('data-reply-error="no_answer"');
    expect(text(failed)).toContain('GitHub did not answer. Approve again later. You can approve it again.');
    expect(text(failed)).toContain('Approve again');
  });

  it('keeps a posted link that does not point at GitHub as no link', () => {
    const html = item(replyDraft({ state: 'POSTED', posted: true, url: 'javascript:alert(1)' }));
    expect(html).not.toContain('javascript:');
  });

  it('asks before posting: the button opens the confirm, and only the confirm posts', () => {
    const html = item(replyDraft());

    // The confirm is closed: nothing in the page posts the reply.
    expect(text(html)).not.toContain('Post it');
    expect(text(html)).not.toContain('Post this reply on GitHub?');

    const source = readFileSync(new URL('./approve-reply-button.tsx', import.meta.url), 'utf8');
    expect(source.match(/approveReply\(/g)).toHaveLength(1);
    const approve = source.slice(source.indexOf('const approve = '), source.indexOf('return ('));
    expect(approve).toContain('approveReply(draftId)');
    expect(source.match(/onClick=\{approve\}/g)).toHaveLength(1);
    const dialog = source.slice(source.indexOf('<DialogFooter>'), source.indexOf('</DialogFooter>'));
    expect(dialog).toContain('onClick={approve}');
    expect(source).toContain('onClick={() => setOpen(true)}');
  });

  it("disables Approve while the follow-up's commits are not pushed, and once they never can be", () => {
    const pending = item(replyDraft(), { attemptId: 'A_F1', state: 'REVIEW', patch: 'diff' });
    expect(pending).toContain('data-blocked="true"');
    expect(text(pending)).toContain('which are not on the pull request yet. Push them first');
    expect(pending).toMatch(/<button[^>]*disabled=""[^>]*>Approve and post/);

    const never = item(replyDraft(), { attemptId: 'A_F1', state: 'STOPPED', patch: 'diff' });
    expect(text(never)).toContain('which were never pushed to the pull request, so it cannot be posted.');

    expect(item(replyDraft(), { attemptId: 'A_F1', state: 'DONE', patch: 'diff' })).toContain('data-blocked="false"');
    expect(item(replyDraft(), { attemptId: 'A_F1', state: 'REVIEW', patch: null })).toContain('data-blocked="false"');
  });

  it("on the follow-up's own page, blocks its replies until the commits are pushed", () => {
    expect(review(followUpAttempts.review)).toContain('data-blocked="true"');
    expect(review(followUpAttempts.repliesOnly)).not.toContain('data-blocked="true"');
    expect(review(followUpAttempts.done)).toContain('data-approve-reply="D_2"');
  });

  it('escapes the drafted text and the comment it answers: both are untrusted', () => {
    const html = item(
      replyDraft({
        text: '<img src=x onerror=alert(1)>',
        comment: { commentId: 'RC_2', author: '<b>x</b>', path: null, line: null, excerpt: '<script>1</script>' },
      }),
    );
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('refusals, in plain words', () => {
  it.each([
    ['The pull request is not open', 'The pull request is no longer open'],
    ['A follow-up is already under way on this pull request', 'A follow-up is already running'],
    ['Every follow-up round (2) is used: the pull request is yours from here', 'Every follow-up round is used'],
    ['New sessions are paused on our side for now', 'New agent sessions are paused on our side'],
    ['Contributing is paused', 'Contributing is paused. Resume it in Settings'],
    ['Your Claude key cannot start a session now', 'Your Claude key cannot start a session now. Check it'],
    ['Your limits leave no room for another attempt now', 'Your spending limits leave no room'],
    [
      "The repository's maintainers opted out of GitRanks Contribute (or do not accept AI-assisted changes): nothing more is sent there",
      "The repo's maintainers keep it out of GitRanks Contribute",
    ],
  ])('a follow-up refused as "%s"', (message, words) => {
    expect(followUpErrorMessage('INVALID', message)).toContain(words);
  });

  it('a follow-up refused with words this UI does not know keeps them, and a lost one says so', () => {
    expect(followUpErrorMessage('INVALID', 'Something new')).toBe('Something new');
    expect(followUpErrorMessage('NOT_FOUND')).toContain('no longer yours');
    expect(followUpErrorMessage('NOT_AVAILABLE_YET')).toBe('This is not available yet. It is coming soon.');
  });

  it.each([
    [
      "This reply describes the follow-up's commits, which are not on the pull request yet: approve them first, then the reply",
      'not on the pull request yet. Push the commits first',
    ],
    ["This reply describes the follow-up's commits, which were never pushed to the pull request", 'never pushed'],
    ['The pull request is no longer open', 'no longer open'],
  ])('a reply refused as "%s" cannot be approved again', (message, words) => {
    const refusal = replyRefusalOf('INVALID', message);
    expect(refusal.final).toBe(true);
    expect(refusal.text).toContain(words);
  });

  it('a reply refused for a reason approving again can mend keeps Approve', () => {
    expect(replyRefusalOf('INVALID', 'Your GitHub login could not be read. Sign in again, then approve again')).toEqual(
      {
        text: 'Your GitHub login could not be read. Sign in again, then approve again',
        final: false,
      },
    );
    expect(replyRefusalOf('FAILED').final).toBe(false);
  });

  it('a Stop that came too late, and an autopilot setting refused while it is coming', () => {
    expect(vetoErrorMessage('INVALID', 'the attempt submitted meanwhile')).toContain(
      'Autopilot submitted it just before',
    );
    expect(vetoErrorMessage('INVALID', 'the attempt is review, not waiting to submit')).toContain(
      'no longer waiting for autopilot',
    );
    expect(
      autopilotErrorMessage(
        'INVALID',
        'Autopilot is coming: it opens once GitRanks can tell you before it submits anything for you',
      ),
    ).toContain('Autopilot is coming soon: it cannot be turned on yet.');
    expect(autopilotErrorMessage('INVALID', 'autopilot unlocks after 3 pull requests merged through GitRanks')).toBe(
      'Autopilot is locked: it unlocks after 3 pull requests merged through GitRanks.',
    );
    expect(autopilotErrorMessage('INVALID', 'Something else was locked')).toBe('Something else was locked');
  });
});

describe('autopilot', () => {
  /** Its row on the Settings summary, and the record its Details dialog opens. */
  const settings = (view: ContributeView) =>
    renderToStaticMarkup(
      <>
        <SettingsScreen view={view} now={NOW} />
        {view.contributor ? <AutopilotRecord autopilot={view.contributor.autopilot} /> : null}
      </>,
    );

  it('says it is coming soon while it is not open, with the record and the toggle off', () => {
    const html = settings(views.autopilotComing);
    const plain = text(html);

    expect(html).toContain('data-autopilot-available="false"');
    expect(plain).toContain('Coming soon');
    expect(plain).toContain('Autopilot is coming soon.');
    expect(plain).toContain('Merged through GitRanks 2');
    expect(plain).toContain('Still needed to unlock 1');
    expect(plain).toContain('Closed without merging in a row 1 of 2');
    expect(plain).toContain('2 of 3 merged PRs');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('lets a setting left on be turned off while autopilot is not open', () => {
    const view = {
      ...views.autopilotComing,
      contributor: {
        ...views.autopilotComing.contributor,
        autopilot: { ...views.autopilotComing.contributor.autopilot, unlocked: true, mergedToUnlock: 0 },
        settings: { ...baseSettings, autopilot: true },
      },
    };
    const html = settings(view);
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? '';

    expect(html).toContain('data-autopilot-available="false"');
    expect(checkbox).toContain('checked=""');
    expect(checkbox).not.toContain('disabled=""');
    expect(text(html)).toContain('Coming soon');
  });

  it('says it is not available yet while the API does not answer whether it is open', () => {
    const html = settings(views.active);

    expect(html).toContain('data-autopilot-available="unknown"');
    expect(text(html)).toContain('Autopilot is not available yet.');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('lets the user turn it on or off once it is open and unlocked', () => {
    const html = settings(views.autopilotUnlocked);

    expect(html).toContain('data-autopilot="unlocked"');
    expect(html).toContain('data-autopilot-available="true"');
    expect(html).not.toContain('data-autopilot-coming');
    expect(text(html)).toContain('Still needed to unlock none, unlocked');
    expect(html).not.toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
  });

  it('says when it locked again, and counts the merges since', () => {
    const plain = text(settings(views.autopilotRelocked));

    expect(plain).toContain('Locked on Oct 20 · 1 of 3 merged since');
    expect(plain).toContain('Locked on Oct 20: two pull requests in a row were closed without merging.');
    expect(plain).toContain('1 of 3 merged PRs');
  });

  it('says where the emails before each submission go, and refuses to turn it on with no email', () => {
    const withNotice = (noticeTo: string | null) => ({
      ...views.autopilotUnlocked,
      contributor: {
        ...views.autopilotUnlocked.contributor,
        autopilot: { ...views.autopilotUnlocked.contributor.autopilot, noticeTo },
        settings: { ...baseSettings, autopilot: false },
      },
    });
    const mailed = settings(withNotice('m•••@gmail.com'));
    expect(text(mailed)).toContain('Emails before each submission go to m•••@gmail.com');
    expect(text(mailed)).toContain('Before autopilot submits, we email you at m•••@gmail.com.');
    expect(mailed).not.toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);

    const unmailed = settings(withNotice(null));
    expect(unmailed).toContain('data-autopilot-no-email');
    expect(text(unmailed)).toContain('Sign in again and share your GitHub email to turn it on.');
    expect(unmailed).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);

    // A setting left on with no address: its changes wait for the review, and it can still be turned off.
    const leftOn = withNotice(null);
    const html = settings({
      ...leftOn,
      contributor: { ...leftOn.contributor, settings: { ...baseSettings, autopilot: true } },
    });
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? '';
    expect(checkbox).toContain('checked=""');
    expect(checkbox).not.toContain('disabled=""');
    expect(text(html)).toContain('so its changes wait for your review');

    // Locked: signing in again would not turn it on, so the row does not say so.
    const locked = withNotice(null);
    const lockedHtml = settings({
      ...locked,
      contributor: {
        ...locked.contributor,
        autopilot: { ...locked.contributor.autopilot, unlocked: false, mergedToUnlock: 1 },
      },
    });
    expect(lockedHtml).not.toContain('data-autopilot-no-email');
  });

  it('words the refusal to turn it on with no email', () => {
    expect(
      autopilotErrorMessage(
        'INVALID',
        'Autopilot emails you before each submission. Sign in again and share your GitHub email to turn it on',
      ),
    ).toContain('we have no email for you');
  });

  it('says it is emailing first while the hour has not started', () => {
    const plain = text(review({ ...followUpAttempts.pendingAutosubmit, autosubmitAt: null }));
    expect(plain).toContain('Emailing you first. The hour starts once the email is sent.');
  });

  it('says why autopilot left a change for the review, and nothing for an ordinary one or the user’s Stop', () => {
    const reviewing = (reviewReason: ContributeAttemptDetail['reviewReason']) =>
      review({
        ...followUpAttempts.pendingAutosubmit,
        state: 'REVIEW',
        autosubmitAt: null,
        autopilot: false,
        reviewReason,
      });
    expect(reviewing('notice_late')).toContain('data-autopilot-review-reason="notice_late"');
    expect(text(reviewing('notice_late'))).toContain('we could not email you first');
    expect(text(reviewing('no_email'))).toContain('we have no email to tell you first');
    expect(text(reviewing('autopilot_off'))).toContain('turned off or locked before it did');
    expect(reviewing('vetoed')).not.toContain('data-autopilot-review-reason');
    expect(reviewing(null)).not.toContain('data-autopilot-review-reason');
  });

  it('counts down to the submission on an attempt waiting for it, with Stop', () => {
    const html = review(followUpAttempts.pendingAutosubmit);

    expect(html).toContain('data-attempt-status="PENDING_AUTOSUBMIT"');
    expect(html).toContain('data-autosubmit-at="2026-10-28T12:42:00.000Z"');
    expect(text(html)).toContain('It submits in 42 minutes, at Oct 28, 12:42 UTC');
    expect(html).toContain('data-stop-autopilot="A_1"');
    expect(text(html)).toContain('Stop');
  });
});

describe('values the UI does not know yet', () => {
  it('renders a new signal kind and a new reply state without failing', () => {
    const html = mine({
      needsYou: {
        since: NOW.toISOString(),
        signals: [{ kind: 'NEW_KIND' as never, at: NOW.toISOString(), detail: null }],
      },
      followUps: followUps(),
    });
    expect(text(html)).toContain('Something changed on it');

    const draft = renderToStaticMarkup(
      <ul>
        <ReplyDraftItem draft={replyDraft({ state: 'ARCHIVED' as never })} prNumber={null} now={NOW} />
      </ul>,
    );
    expect(draft).toContain('data-reply-state="ARCHIVED"');
    expect(text(draft)).toContain('Archived');
    expect(draft).not.toContain('data-approve-reply');
  });
});

describe('the follow-up flow: review feedback, the run, the result and the rounds', () => {
  // The pull request's page on the round not started yet, where the waiting comments are chosen.
  const prOpen = (patch: Partial<ContributeAttemptDetail> = {}) =>
    review(
      {
        ...followUpAttempts.prNeedsYou,
        reviewFeedback: {
          readAt: '2026-10-28T11:50:00.000Z',
          threads: [
            feedbackThread(),
            feedbackThread({ commentId: 'C_2', threadId: 'T_2', excerpt: 'Translate the <b>title</b>.' }),
            feedbackThread({
              commentId: 'C_3',
              threadId: 'T_3',
              bot: false,
              author: 'maintainer-mo',
              excerpt: 'Name it collapse?',
            }),
            feedbackThread({ commentId: 'C_4', threadId: 'T_4', ignored: true, excerpt: 'Add a baseline.' }),
          ],
        },
        ...patch,
      },
      views.active,
      true,
    );

  it('lists the waiting comments, bots and people apart, each to Address or Ignore, with one button', () => {
    const html = prOpen();
    const plain = text(html);
    expect(html).toContain('data-panel="review-feedback"');
    expect(plain).toContain('3 comments wait for an answer on pull request #1419');
    expect(plain).toContain('Bots · 2');
    expect(plain).toContain('People · 1');
    // Ignored in an earlier round: listed apart, not counted.
    expect(html).not.toContain('data-feedback-thread="C_4"');
    expect(plain).toContain('Show 1 ignored in an earlier round');
    expect(plain).toContain('Address 3 comments');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(3);
    // The card starts the round, so the plain button is not offered beside it.
    expect(html).not.toContain('data-start-follow-up');
    // Strangers' words are text, never markup.
    expect(html).not.toContain('<b>title</b>');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r901"');
  });

  it('says why no round can start while one runs, and keeps the plain button without waiting comments', () => {
    const busy = text(prOpen({ followUps: followUps({ used: 1, left: 1, currentAttemptId: 'A_F1' }) }));
    expect(busy).toContain('A follow-up is under way on these comments.');
    expect(busy).not.toContain('Address 3 comments');
    const none = prOpen({ reviewFeedback: { readAt: null, threads: [] } });
    expect(none).not.toContain('data-panel="review-feedback"');
    expect(none).toContain('data-start-follow-up');
  });

  it('shows the run as four steps: reading, fixing once the work is sent, then our checks', () => {
    const run = (patch: Partial<ContributeAttemptDetail>) =>
      review(followUpAttempts.review && { ...followUpAttempts.review, ...patch });
    const reading = run({
      state: 'RUNNING',
      events: [{ state: 'RUNNING', detail: 'follow_up: no claim', at: '2026-10-28T11:00:00.000Z' }],
    });
    expect(reading).toContain('data-follow-up-step="reading"');
    expect(reading).toMatch(/data-step="reading" data-step-state="current"/);
    expect(text(reading)).toMatch(/Reading comments : now .*Fixing : next .*Checks : next .*Ready for you : next/);
    const fixing = run({
      state: 'RUNNING',
      events: [
        { state: 'RUNNING', detail: 'go: budget raised to $5.00, the work sent', at: '2026-10-28T11:01:00.000Z' },
      ],
    });
    expect(fixing).toMatch(/data-step="fixing" data-step-state="current"/);
    expect(fixing).toMatch(/data-step="reading" data-step-state="done"/);
    expect(run({ state: 'CHECKS' })).toMatch(/data-step="checks" data-step-state="current"/);
    expect(text(run({ state: 'RUNNING' }))).toContain('Nothing goes to GitHub before you approve it');
  });

  const inReview = (patch: Partial<ContributeAttemptDetail> = {}) =>
    followUpAttempts.review && {
      ...followUpAttempts.review,
      checkStatus: {
        status: 'NOT_RUN' as const,
        note: 'The tests could not run in the sandbox (npm test), so nothing here proves the change works.',
      },
      replyDrafts: [
        flowDraft(),
        flowDraft({
          draftId: 'D_2',
          bot: false,
          comment: { ...flowDraft().comment!, author: 'maintainer-mo' },
          prefix: 'Fixed in <commit>: ',
        }),
        flowDraft({
          draftId: 'D_3',
          outcome: 'SKIPPED',
          prefix: 'Not changed: ',
          reason: 'Shared component',
          text: 'Out of scope here.',
        }),
        flowDraft({
          draftId: 'D_4',
          outcome: 'NEEDS_YOU',
          prefix: null,
          reason: 'Trim too, or only collapse?',
          text: '',
        }),
      ],
      ...patch,
    };

  it('shows each comment’s outcome, the checks in plain words, the diff and one approval', () => {
    const html = review(inReview());
    const plain = text(html);
    expect(html).toContain('data-panel="follow-up-result"');
    expect(html).toContain('data-check-status="NOT_RUN"');
    expect(plain).toContain('The tests could not run');
    expect(plain).toContain('Fixed');
    expect(plain).toContain('Not changed');
    expect(plain).toContain('Needs you');
    expect(plain).toContain('Question for you: Trim too, or only collapse?');
    expect(plain).toContain('Reply, posted in your name after “Fixed in the new commit:”');
    // The bot's thread is resolved after; the person's stays open for its reviewer.
    expect(plain).toContain('then resolve the thread');
    expect(plain).toContain('the thread stays open for its reviewer');
    expect(plain).toContain('Push fixes and reply');
    expect(plain).toContain('Discard');
    expect(plain).toContain(
      'Approving pushes the new commits to pull request #1419, posts 3 replies, resolves 2 threads.',
    );
    // The diff sits in the card, before the approval; the old one-by-one approval is gone.
    expect(html.indexOf('data-file="src/router/normalize-path.ts"')).toBeGreaterThan(
      html.indexOf('data-panel="follow-up-result"'),
    );
    expect(html).not.toContain('data-follow-up-approval');
    expect(html).not.toContain('data-panel="replies"');
  });

  it('blocks the push on a failed rail, saying so, and keeps Discard', () => {
    const plain = text(
      review(
        inReview({ checkStatus: { status: 'BLOCKED', note: 'It cannot be pushed: it changes a GitHub workflow.' } }),
      ),
    );
    expect(plain).toContain('Our checks block this push');
    expect(plain).toContain('These commits cannot be pushed. Discard them, or answer the threads on GitHub yourself.');
    expect(plain).toContain('Discard');
  });

  it('after the push: the round line, and each reply posted, resolved or left open', () => {
    const html = review(
      inReview({
        state: 'DONE',
        round: {
          round: 1,
          attemptId: 'A_F1',
          state: 'DONE',
          endReason: null,
          pushedSha: '46de700aa1',
          fixed: 5,
          skipped: 0,
          needsYou: 0,
          replied: 2,
          resolved: 1,
          at: '2026-10-28T12:00:00.000Z',
        },
        replyDrafts: [
          flowDraft({
            state: 'POSTED',
            posted: true,
            resolveState: 'RESOLVED',
            text: 'Fixed in 46de700: Made it a const.',
            url: 'https://github.com/driftwood-js/driftwood/pull/1419#discussion_r905',
          }),
          flowDraft({
            draftId: 'D_2',
            bot: false,
            state: 'POSTED',
            posted: true,
            text: 'Fixed in 46de700: Renamed it.',
          }),
          flowDraft({
            draftId: 'D_3',
            state: 'FAILED',
            lastError: {
              reason: 'forbidden',
              note: 'GitHub refused the reply: the conversation is locked.',
              at: '2026-10-28T12:00:00.000Z',
            },
          }),
        ],
      }),
    );
    const plain = text(html);
    expect(plain).toContain('Round 1 pushed 46de700 · 5 fixed · 2 replied · 1 resolved');
    expect(plain).toContain('Replied and resolved');
    expect(plain).toContain('Replied, left open for its reviewer');
    expect(plain).toContain('GitHub refused the reply: the conversation is locked.');
    expect(plain).not.toContain('Push fixes and reply');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419#discussion_r905"');
  });

  it('lines the rounds up on the pull request’s page', () => {
    const plain = text(
      prOpen({
        followUps: followUps({
          used: 2,
          left: 0,
          history: [
            {
              round: 1,
              attemptId: 'A_F1',
              state: 'DONE',
              endReason: null,
              pushedSha: '46de700aa1',
              fixed: 5,
              skipped: 0,
              needsYou: 0,
              replied: 2,
              resolved: 0,
              at: '2026-10-28T12:00:00.000Z',
            },
            {
              round: 2,
              attemptId: 'A_F2',
              state: 'STOPPED',
              endReason: 'NO_GO',
              pushedSha: null,
              fixed: 0,
              skipped: 0,
              needsYou: 0,
              replied: 0,
              resolved: 0,
              at: '2026-10-28T13:00:00.000Z',
            },
          ],
        }),
      }),
    );
    expect(plain).toContain('Round 1 · follow-up Pushed 46de700');
    expect(plain).toContain('5 fixed · 2 replied');
    expect(plain).toContain('Round 2 · follow-up Stopped');
    expect(plain).toContain('Every follow-up round is used: answer these on GitHub.');
  });

  it('never stops silently: each end says what happened and what the user can do', () => {
    const noGo = text(
      review({ ...followUpAttempts.stopped, endReason: 'NO_GO', endDetail: 'The comments ask for a redesign.' }),
    );
    expect(noGo).toContain('Stopped, nothing pushed');
    expect(noGo).toContain('The agent read the comments and decided not to change anything.');
    expect(noGo).toContain('Its reason: The comments ask for a redesign.');
    expect(noGo).toContain('start another round from its page');
    expect(noGo).toContain('Back to the pull request');
    const empty = text(review({ ...followUpAttempts.stopped, endReason: 'CHECKS_FAILED', endDetail: 'not_empty' }));
    expect(empty).toContain('The agent wrote no commit and no reply');
  });

  it('never takes more than a round can: past 20 comments it asks to ignore the rest first', () => {
    const many = Array.from({ length: 22 }, (_, index) =>
      feedbackThread({ commentId: `C_${index}`, threadId: `T_${index}` }),
    );
    const plain = text(prOpen({ reviewFeedback: { readAt: null, threads: many } }));
    expect(plain).toContain('Address 22 comments');
    expect(plain).toContain('A round takes 20 comments at most. Set 2 to Ignore for now');
  });

  it('marks the Checks step as our checks came out, and says what an older stop really was', () => {
    const blocked = review(
      inReview({ checkStatus: { status: 'BLOCKED', note: 'It cannot be pushed: it changes a GitHub workflow.' } }),
    );
    expect(blocked).toMatch(/data-step="checks" data-step-state="failed"/);
    expect(review(inReview())).toMatch(/data-step="checks" data-step-state="skipped"/);
    const older = text(review({ ...followUpAttempts.stopped, endReason: 'CHECKS_FAILED', endDetail: 'tests_passed' }));
    expect(older).toContain('Our checks stopped it before the review.');
    expect(older).not.toContain('wrote no commit');
  });

  it('after the push, offers to post a reply that did not go with it', () => {
    const plain = text(review(inReview({ state: 'DONE', replyDrafts: [flowDraft({ draftId: 'D_9' })] })));
    expect(plain).toContain('Not posted with the push. Post it now if you want it.');
  });

  it('shows a round with no reply as the flow’s, with its checks', () => {
    const html = review(inReview({ replyDrafts: [] }));
    expect(html).toContain('data-panel="follow-up-result"');
    expect(text(html)).toContain('The agent drafted no reply this round.');
    expect(html).not.toContain('data-follow-up-approval');
  });

  it('keeps the drafts one by one on an API without the flow', () => {
    const html = review(followUpAttempts.review);
    expect(html).not.toContain('data-panel="follow-up-result"');
    expect(html).toContain('data-follow-up-approval="A_F1"');
  });
});
