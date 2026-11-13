import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/attempts/A_1/runs/A_F1',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));

const { ReviewComments } = await import('./review-comments');
const { SessionActionsProvider } = await import('./session-actions');
const { ApproveReplyButton } = await import('./approve-reply-button');
const { flowDraft, replyDraft, followUps, detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { afterPush, allResolved, commentsInit, inReview, notPosted, orgRefused, posted, waitingThreads } = await import(
  '@/lib/contribute/__fixtures__/review-comments'
);
const { firstAttemptDraftsOf } = await import('@/lib/contribute/review-comments');

import type { ReviewCommentsProps } from './review-comments';
import type { SessionActionsSeed } from './session-actions';
import type { CommentActionsInit } from '@/lib/contribute/comment-actions';
import type { ActionId } from '@/lib/contribute/hard-stop';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');
const count = (html: string, needle: string) => html.split(needle).length - 1;

const RUN = {
  attemptId: 'A_F1',
  state: 'DONE' as const,
  updatedAt: '2026-10-28T12:00:00.000Z',
  hasPatch: true,
  flow: true,
};

const base: ReviewCommentsProps = {
  mode: 'perReply',
  run: RUN,
  prNumber: 1419,
  org: 'driftwood-js',
  blocked: new Set(),
  prOpen: true,
  grantConnected: false,
  grantAvailable: true,
  cardReasons: {},
  cardShown: true,
  orgAccess: { url: 'https://github.com/settings/connections/applications/abc', app: true },
  now: new Date('2026-10-28T12:00:00.000Z'),
};

const render = (
  props: Partial<ReviewCommentsProps> = {},
  init: Partial<CommentActionsInit> = {},
  seed?: SessionActionsSeed,
) =>
  renderToStaticMarkup(
    <SessionActionsProvider
      init={commentsInit({ drafts: props.drafts ?? [], threads: props.threads ?? [], ...init })}
      seed={seed}
    >
      <ReviewComments {...base} {...props} />
    </SessionActionsProvider>,
  );

const panel = (html: string) => html.slice(html.indexOf('data-panel="review-comments"'));

describe('review comments, one list (M7)', () => {
  it('1. seven replies the org refused, said by the card: "Not posted" rows, all closed, no note', () => {
    const html = render({ drafts: orgRefused(), cardReasons: { A_F1: ['org_restricted'] } });
    expect(count(html, 'data-row-state="not-posted-elsewhere"')).toBe(7);
    expect(count(html, '>Not posted<')).toBe(7);
    expect(html).not.toContain('data-reply-error');
    expect(html).not.toContain('data-org-access');
    expect(text(html)).not.toMatch(/Approve again|Try again|GitHub did not take it/);
    expect(html).not.toContain('<h3');
    expect(count(html, 'bg-warning-soft')).toBe(7);
  });

  it('2. one of them opened: copy, the thread, Post as a comment instead, still no note', () => {
    const html = render({ drafts: orgRefused(), cardReasons: { A_F1: ['org_restricted'] }, openRows: ['D_3'] });
    const words = text(html);
    expect(words).toContain('Open the thread ↗');
    expect(words).toContain('Post as a comment instead');
    expect(html).toContain('Copy the reply to maintainer-mo');
    expect(html).not.toContain('data-reply-error');
    expect(words).not.toContain('Dismiss');
  });

  it('3. one transient failure among posted replies: open, its note once, Try again, Copy, Dismiss', () => {
    const html = render({ drafts: [posted('D_1'), notPosted('D_2', 'transient'), posted('D_3')] });
    expect(html).toContain('data-row-state="not-posted-own"');
    expect(count(html, 'data-reply-error="transient"')).toBe(1);
    const words = text(html);
    expect(count(words, 'Try again')).toBe(1);
    expect(count(words, 'Dismiss')).toBe(1);
    expect(html).toContain('Copy the reply to maintainer-mo');
    expect(count(html, 'data-row-state="posted"')).toBe(2);
    expect(count(html, '>Replied<')).toBe(2);
    expect(html).toContain('bg-negative/10');
  });

  it('4. a lone forbidden reply goes as a comment, a lone org refusal links the org, a lone not-found only copies', () => {
    const forbidden = text(render({ drafts: [notPosted('D_1', 'forbidden')] }));
    expect(forbidden).toContain('Post as a comment instead');
    expect(forbidden).not.toContain('Try again');
    const org = render({ drafts: [notPosted('D_1', 'org_restricted')] });
    expect(count(org, 'data-org-access')).toBe(1);
    expect(text(org)).toContain('Post as a comment instead');
    const gone = render({ drafts: [notPosted('D_1', 'not_found', { canPostAsComment: false })] });
    expect(gone).toContain('data-reply-error="not_found"');
    expect(text(gone)).toContain('Dismiss');
    expect(text(gone)).not.toMatch(/Try again|Post as a comment|Post this reply/);
  });

  it('5. two resolve failures for one reason: one line under Posted; a lone one keeps its note', () => {
    const failed = { reason: 'forbidden', note: 'No access to resolve threads.', at: '2026-10-28T11:59:00.000Z' };
    const html = render({
      drafts: [
        posted('D_1', { resolveState: 'FAILED', lastError: failed }),
        posted('D_2', { resolveState: 'FAILED', lastError: failed }),
      ],
      openRows: ['D_1'],
    });
    expect(text(html)).toContain("2 threads weren't resolved: No access to resolve threads.");
    expect(count(html, '>Replied · not resolved<')).toBe(2);
    expect(html).not.toContain('data-reply-error');
    const lone = render({
      drafts: [posted('D_1', { resolveState: 'FAILED', lastError: { ...failed, reason: 'transient', note: 'Busy.' } })],
      openRows: ['D_1'],
    });
    expect(lone).toContain('data-reply-error="transient"');
  });

  it('6. a merged PR, two replies failed for one reason: one line under Not posted, no note per row', () => {
    const html = render({ drafts: [notPosted('D_1', 'transient'), notPosted('D_2', 'transient')], prOpen: false });
    expect(count(html, 'data-comments-line="not-posted"')).toBe(1);
    expect(text(html)).toContain("GitHub didn't answer when GitRanks posted them.");
    expect(count(html, 'data-row-state="not-posted-elsewhere"')).toBe(2);
    expect(html).not.toContain('data-reply-error');
  });

  it('7. every thread resolved on GitHub: one closed group, the tallies and "all resolved"', () => {
    const html = render({ drafts: allResolved() });
    expect(text(html)).toContain('Resolved on GitHub · 7');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-row-state');
    expect(text(html)).not.toContain('the thread was resolved');
    expect(text(html)).toContain('7 fixed · all resolved');
    expect(html).not.toContain('data-group="not-posted"');
  });

  it('9. an ignored thread waits in its closed group; open, its switch on Ignore; a choice error under its switch', () => {
    const threads = waitingThreads();
    const closed = render({ mode: 'waiting', threads, run: null }, { session: 'next' });
    expect(closed).not.toContain('id="comment-C_3"');
    expect(text(closed)).toContain('Ignored · 1');
    expect(closed).toMatch(/aria-controls="[^"]+"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*aria-controls/);
    const open = render({ mode: 'waiting', threads, run: null, defaultOpen: ['ignored'] }, { session: 'next' });
    const row = open.slice(open.indexOf('id="comment-C_3"'));
    expect(row).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Ignore/);
    const failed = render(
      { mode: 'waiting', threads, run: null },
      { session: 'next' },
      {
        error: { source: 'choice', text: 'It could not be saved.', key: 'C_2' },
      },
    );
    const c2 = failed.slice(failed.indexOf('id="comment-C_2"'));
    expect(c2.slice(0, c2.indexOf('</li>'))).toContain('role="alert"');
    expect(count(failed, 'It could not be saved.')).toBe(1);
  });

  it('10. a review: a question open with its answer field, ticks, "resolves", Discard comment in opened rows', () => {
    const drafts = inReview();
    const html = render(
      { mode: 'review', drafts, run: { ...RUN, state: 'REVIEW' }, openRows: ['D_B', 'D_T'] },
      { runState: 'REVIEW', drafts },
    );
    const words = text(html);
    expect(words).toContain('Needs you · 1');
    expect(words).toContain('Ready to post · 4');
    expect(html).toContain('placeholder="Write your answer, or leave it for GitHub"');
    expect(html).toContain('Question for you');
    const bot = html.slice(html.indexOf('id="comment-D_B"'));
    expect(bot.slice(0, bot.indexOf('</li>'))).toContain('then resolves the thread');
    const person = html.slice(html.indexOf('id="comment-D_P"'));
    expect(person.slice(0, person.indexOf('</li>'))).not.toContain('then resolves the thread');
    expect(html).toContain(
      'aria-label="Discard the comment of coderabbitai: no reply, and left out until someone comments on it again"',
    );
    const top = html.slice(html.indexOf('id="comment-D_T"'));
    expect(top.slice(0, top.indexOf('</li>'))).not.toContain('Discard comment');
    expect(count(words, 'Discard comment')).toBe(2);
  });

  it('11. after the run: a question left reads "Left for GitHub", an empty reply "No reply", both under Posted', () => {
    const html = render({ drafts: afterPush() });
    expect(text(html)).toContain('Left for GitHub');
    expect(text(html)).toContain('No reply');
    expect(html).not.toContain('data-group="needs-you"');
  });

  it('12. older API rows: no pill, no post button in a no-flow review with commits; Draft rows post after; first attempt', () => {
    const older = [replyDraft(), replyDraft({ draftId: 'D_2', comment: null, text: 'Fixed the lint.' })];
    const inReviewNoFlow = render(
      { drafts: older, run: { ...RUN, state: 'REVIEW', flow: false }, openRows: ['D_1'] },
      { runState: 'REVIEW', flow: false },
    );
    expect(inReviewNoFlow).not.toContain('Fixed<');
    expect(text(inReviewNoFlow)).not.toContain('Post this reply');
    expect(count(inReviewNoFlow, 'data-comments-line="ready"')).toBe(1);
    expect(text(render({ drafts: older, openRows: ['D_1'] }))).toContain('Post this reply');
    const first = detail({
      replyDrafts: [
        replyDraft({ draftId: 'D_1' }),
        replyDraft({
          draftId: 'D_9',
          attemptId: 'A_F9',
          state: 'FAILED',
          lastError: { reason: 'invalid', note: 'Too long.', at: '' },
        }),
      ],
      followUps: followUps({ history: [{ round: 1, attemptId: 'A_F1' } as never] }),
    });
    const html = render({
      drafts: firstAttemptDraftsOf(first),
      run: null,
      first: { attemptId: 'A_1', state: 'PR_OPEN', updatedAt: '2026-10-28T12:00:00.000Z', currentAttemptId: null },
    });
    expect(html).not.toContain('id="comment-D_1"');
    expect(html).toContain('data-reply-error="invalid"');
    expect(text(html)).toContain('From a run →');
    expect(
      text(
        render({
          drafts: firstAttemptDraftsOf({ ...first, followUps: followUps() }),
          run: null,
          openRows: ['D_1'],
          first: { attemptId: 'A_1', state: 'PR_OPEN', updatedAt: '', currentAttemptId: null },
        }),
      ),
    ).toContain('Post this reply');
  });

  it('13. a maintainer’s stop hides every post control, the ticks and the editor; Discard, switch, Copy, Dismiss stay', () => {
    const blocked = new Set<ActionId>(['post_reply', 'push', 'resolve_threads', 'start_run']);
    const drafts = inReview();
    const review = render(
      { mode: 'review', drafts, run: { ...RUN, state: 'REVIEW' }, blocked, openRows: ['D_B'] },
      { runState: 'REVIEW', drafts, blocked },
    );
    expect(review).not.toContain('role="checkbox"');
    expect(review).not.toContain('<textarea');
    expect(review).not.toContain('then resolves');
    expect(text(review)).toContain('Discard comment');
    expect(text(review)).not.toContain('Not available:');
    const after = render({ drafts: [notPosted('D_1', 'transient')], blocked });
    expect(text(after)).not.toMatch(/Try again|Post this reply|Post as a comment/);
    expect(text(after)).toContain('Dismiss');
    expect(after).toContain('Copy the reply');
    const saidNo = new Set<ActionId>(['start_run']);
    const waiting = render(
      { mode: 'waiting', threads: waitingThreads(), run: null, blocked: saidNo },
      { session: 'next', blocked: saidNo },
    );
    expect(waiting).toContain('aria-pressed');
    expect(text(render({ drafts: [notPosted('D_1', 'transient')], blocked: saidNo }))).toContain('Try again');
  });

  it('14. a closed PR: no post control on any row; Copy and Dismiss stay', () => {
    const html = text(
      render({
        drafts: [notPosted('D_1', 'transient'), flowDraft({ draftId: 'D_2' })],
        prOpen: false,
        openRows: ['D_2'],
      }),
    );
    expect(html).not.toMatch(/Try again|Post this reply|Post as a comment/);
    expect(html).toContain('Dismiss');
  });

  it('15. never a default button inside the list', () => {
    const fixtures = [
      render({ drafts: orgRefused(), openRows: ['D_1'] }),
      render({ drafts: afterPush(), openRows: ['D_1', 'D_3'] }),
      render(
        { mode: 'review', drafts: inReview(), run: { ...RUN, state: 'REVIEW' }, openRows: ['D_B'] },
        { runState: 'REVIEW', drafts: inReview() },
      ),
      render({ mode: 'waiting', threads: waitingThreads(), run: null, defaultOpen: ['ignored'] }, { session: 'next' }),
    ];
    for (const html of fixtures) expect(panel(html)).not.toContain('data-variant="default"');
  });

  it('16. untrusted text renders as text; a link off GitHub is no link', () => {
    const html = render({
      drafts: [
        posted('D_1', {
          comment: { commentId: 'C', author: 'x<b>y</b>', path: null, line: null, excerpt: '<b>bold</b>' },
          reason: '<b>why</b>',
          text: '<b>reply</b>',
          url: 'https://evil.example/x',
        }),
      ],
      openRows: ['D_1'],
    });
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).not.toContain('evil.example');
  });

  it('17. phone: the author hides beside a pill, the chip stays on line 1, the side control follows the toggle', () => {
    const html = render(
      { mode: 'review', drafts: [flowDraft()], run: { ...RUN, state: 'REVIEW' } },
      { runState: 'REVIEW', drafts: [flowDraft()] },
    );
    expect(html).toMatch(/max-sm:hidden"[^>]*>coderabbitai/);
    const row = html.slice(html.indexOf('id="comment-D_1"'));
    expect(row.indexOf('aria-controls')).toBeLessThan(row.indexOf('role="checkbox"'));
    const after = render({ drafts: [posted('D_1')] });
    const line = after.slice(after.indexOf('id="comment-D_1"'));
    expect(line.indexOf('Replied')).toBeLessThan(line.indexOf('aria-controls'));
  });

  it('19. a discard error under its row only when no card is drawn', () => {
    const drafts = inReview();
    const seed = { error: { source: 'discard' as const, text: 'It could not be left out.', key: 'D_B' } };
    const props = { mode: 'review' as const, drafts, run: { ...RUN, state: 'REVIEW' as const } };
    const noCard = render({ ...props, cardShown: false }, { runState: 'REVIEW', drafts }, seed);
    expect(noCard).toContain('It could not be left out.');
    expect(render({ ...props, cardShown: true }, { runState: 'REVIEW', drafts }, seed)).not.toContain(
      'It could not be left out.',
    );
  });

  it('20. read-only runs: autopilot’s without chips or ticks; a discarded run with commits says "Nothing posted"', () => {
    const autopilot = render({
      mode: 'readOnly',
      drafts: [flowDraft(), flowDraft({ draftId: 'D_2' })],
      run: { ...RUN, state: 'PENDING_AUTOSUBMIT' },
    });
    expect(autopilot).not.toContain('role="checkbox"');
    expect(count(autopilot, 'data-row-state="read-only"')).toBe(2);
    const discarded = render({
      mode: 'readOnly',
      drafts: [flowDraft(), flowDraft({ draftId: 'D_2', state: 'DISMISSED', dismissedReason: 'NOT_NEEDED' })],
      run: { ...RUN, state: 'DISCARDED' },
    });
    expect(text(discarded)).toContain('Nothing posted');
    expect(discarded).toContain('data-group="dismissed"');
  });

  it('21. a final refusal takes the button’s place, once', () => {
    // The refusal arrives with a click; its markup after one is the status line alone, no button.
    const html = renderToStaticMarkup(
      <ApproveReplyButton draftId="D_1" where="as a comment on pull request #1419" version="v1" />,
    );
    expect(html).toContain('data-variant="outline"');
    expect(text(html)).toContain('Post this reply');
    expect(html).not.toContain('data-variant="default"');
  });

  it('draws nothing without a row', () => {
    expect(render({ drafts: [] })).not.toContain('data-panel="review-comments"');
  });
});
