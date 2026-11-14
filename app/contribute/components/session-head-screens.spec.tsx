import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The address the page is read at: `useSearchParams` reads it, as Next keeps it in step with the address. */
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/attempts/A_1',
  useSearchParams: () => new URLSearchParams(search),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadPrNotes: vi.fn(async () => undefined),
  loadRepliesWaiting: vi.fn(async () => []),
  loadResolveHumanThreads: vi.fn(async () => undefined),
}));

const { ReviewScreen, FirstSessionView, nextPaneShows } = await import('./review-view');
const { useSessionActions } = await import('./session-actions');
const { MarkHandledButton } = await import('./follow-up-buttons');
const data = await import('@/lib/contribute/contribute.data');
const { NOW, mcpToken, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { prNotes } = await import('@/lib/contribute/__fixtures__/maintainers');
const { replyWaiting } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const {
  attempts,
  decisionAttempts,
  detail,
  feedbackThread,
  flowDraft,
  followUp,
  followUpAttempts,
  followUpRun,
  followUps,
  ownAgentAttempt,
  pullRequest,
} = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { nextForDco, nextForProof, nextForRepoOut, nextForRun, nextForSilent, nextForYou, proofSession, signal } =
  await import('@/lib/contribute/__fixtures__/needs-you');
const { contributionMovesOf } = await import('@/lib/contribute/contribution-moves');
const fixtures = await import('@/lib/contribute/__fixtures__/session-head');

import type { ComponentProps } from 'react';

import type {
  ContributeAttemptDetail,
  ContributeReplyWaiting,
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

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

/** The buttons drawn as the view's main action and not inside a `hidden` element (a held card not shown). */
function visiblePrimaries(html: string): string[] {
  const found: string[] = [];
  const stack: boolean[] = [];
  for (const [tag, close, name, attrs] of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
    if (close) {
      stack.pop();
      continue;
    }
    const hidden = (stack.at(-1) ?? false) || / hidden=""/.test(attrs);
    if (!hidden && /data-slot="button"/.test(attrs) && /data-variant="default"/.test(attrs)) found.push(tag);
    if (!VOID.has(name.toLowerCase()) && !attrs.endsWith('/')) stack.push(hidden);
  }
  return found;
}

/** The words of every button drawn (and every link drawn as one). */
const buttons = (html: string) =>
  [...html.matchAll(/<(button|a)\b[^>]*>(.*?)<\/\1>/g)]
    .filter(([tag]) => tag.startsWith('<button') || tag.includes('data-slot="button"'))
    .map(([, , inner]) => text(inner).trim());

type Props = Partial<ComponentProps<typeof ReviewScreen>>;
const page = (attempt: ContributeAttemptDetail, props: Props = {}) =>
  renderToStaticMarkup(<ReviewScreen view={views.active} attempt={attempt} now={NOW} {...props} />);
const heads = (html: string) => html.match(/data-session-head="/g) ?? [];
const stop = prNotes({ stopped: { login: 'sam-w', at: '2026-10-28T11:04:00.000Z' } });

/** A first attempt on #1419 after run 1 pushed, nothing new on it. */
const afterRun = (patch: Partial<ContributeAttemptDetail> = {}) =>
  detail({ ...followUpAttempts.quiet, followUps: followUps({ used: 1, history: [followUpRun()] }), ...patch });

/** Run 1, done, with the replies it drafted. */
const runOf = (patch: Partial<ContributeAttemptDetail> = {}) =>
  followUp({ state: 'DONE', round: followUpRun(), ...patch });

const refused = (count: number, reason = 'org_restricted'): ContributeReplyWaiting[] =>
  Array.from({ length: count }, (_, index) =>
    replyWaiting({
      ...flowDraft({
        draftId: `D_${index}`,
        comment: { ...flowDraft().comment!, commentId: `C_${index}` },
        prefix: 'Fixed in 46de700: ',
        body: 'Fixed in 46de700: Made it a const.',
      }),
      state: 'FAILED',
      lastError: { reason, note: 'GitHub did not let us post it.', at: '2026-10-28T11:59:00.000Z' },
      nameWithOwner: 'driftwood-js/driftwood',
      prNumber: 1419,
      inReview: false,
    }),
  );

/** The proof back for review and a sign-off missing: two held cards on the next step, a run that may start. */
const proofAndDco = () =>
  detail({
    ...nextForProof.review,
    needsYou: { since: NOW.toISOString(), signals: [...nextForProof.review.needsYou!.signals, signal('DCO')] },
  });

/** The section a page's head draws: its status line's title, or its shown card's. */
const headTitle = (html: string) => {
  const at = html.indexOf('data-session-head=');
  return text(html.slice(at, at + 4000).match(/<h2[^>]*>(.*?)<\/h2>/)?.[1] ?? '').trim();
};

/** Every state these specs draw, for the page-wide rules. */
const STATES: [string, () => string][] = [
  ['review', () => page(decisionAttempts.went)],
  ['bounced', () => page(attempts.bounced)],
  ['review, form open', () => page(decisionAttempts.went, { seed: { formOpen: true } })],
  ['own review', () => page(ownAgentAttempt)],
  ['grant', () => page(attempts.bounced, { view: views.firstKey })],
  ['no-go', () => page(decisionAttempts.noGo)],
  ['ran out', () => page(decisionAttempts.ranOut)],
  ['running', () => page(attempts.running)],
  ['pr open', () => page(followUpAttempts.prNeedsYou)],
  ['next run', () => page(nextForRun, { next: true })],
  ['next, nothing waits', () => page(followUpAttempts.quiet, { next: true })],
  ['found', () => page(nextForYou, { next: true })],
  ['dco', () => page(nextForDco, { next: true })],
  ['silent', () => page(nextForSilent, { next: true })],
  ['repo out', () => page(nextForRepoOut, { next: true })],
  ['proof review', () => page(nextForProof.review, { next: true })],
  ['proof working', () => page(nextForProof.working, { next: true })],
  ['run ready', () => page(followUpAttempts.review)],
  ['run done, refused', () => page(runOf({ replyDrafts: refused(7) }), { first: afterRun(), replies: refused(7) })],
  ['stopped next run', () => page(nextForRun, { next: true, prNotes: stop })],
  ['proof held back by a stop', () => page(nextForProof.review, { next: true, prNotes: stop })],
  ['proof and dco, a run may start', () => page(proofAndDco(), { next: true })],
];

beforeEach(() => {
  search = '';
});

describe('the session head, page-wide', () => {
  it.each(STATES)('%s: one head with a title, at most one visible main button, note ids unique', (_name, render) => {
    const html = render();
    expect(heads(html)).toHaveLength(1);
    expect(headTitle(html)).not.toBe('');
    expect(visiblePrimaries(html).length).toBeLessThanOrEqual(1);
    const ids = html.match(/id="note-[^"]+"/g) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never says "Not available" for a control, nor "Approve again"', () => {
    for (const [, render] of STATES) {
      const html = render();
      expect(text(html)).not.toContain('Not available:');
      expect(buttons(html).some((label) => label.startsWith('Approve again'))).toBe(false);
    }
  });
});

describe('the review card and the pull request form', () => {
  it('draws no primary while the form is open: Submit is the one', () => {
    for (const html of [
      page(decisionAttempts.went, { seed: { formOpen: true } }),
      page(ownAgentAttempt, { seed: { formOpen: true } }),
      page(attempts.bounced),
      page(attempts.bounced, { view: views.firstKey }),
    ]) {
      expect(html).toContain('data-submit-panel="open"');
      const [only] = visiblePrimaries(html);
      expect(only).toContain('type="submit"');
    }
    // Closed, the card's Write the pull request is the main button.
    const closed = page(decisionAttempts.went);
    expect(closed).toContain('data-submit-panel="closed"');
    expect(visiblePrimaries(closed)[0]).not.toContain('type="submit"');
    expect(text(closed)).toContain('Write the pull request');
  });

  it('opens the form with the page after a bounce, and on the way back from GitHub', () => {
    expect(page(attempts.bounced)).toContain('data-submit-panel="open"');
    expect(page(decisionAttempts.went, { resumed: true })).toContain('data-submit-panel="open"');
  });

  it('keeps the card’s Discard and the form’s Submit off while the submit runs', () => {
    const html = page(decisionAttempts.went, { seed: { pending: 'submit', formOpen: true } });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Discard<\/button>/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""|<button[^>]*disabled=""[^>]*type="submit"/);
  });

  it('shows a submit error in the card while the form’s dialog is closed', () => {
    const html = page(decisionAttempts.went, { seed: { error: { source: 'submit', text: 'GitHub said no.' } } });
    const card = html.slice(html.indexOf('data-move="review"'), html.indexOf('data-panel="agent-did"'));
    expect(card).toContain('data-move-error="submit"');
    expect(text(card)).toContain('GitHub said no.');
    // A push's error is its confirm's to show, never the card's.
    const push = page(followUpAttempts.review, { seed: { error: { source: 'push', text: 'Push refused.' } } });
    expect(push).not.toContain('Push refused.');
  });

  it('keeps own-state controls off while a long action runs', () => {
    const html = page(nextForYou, { next: true, seed: { pending: 'start' } });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>I(&#x27;|')ve done it<\/button>/);
  });

  it('a bounce the repo’s limits hold has no Try again, and points at the repo’s rules', () => {
    const busy = detail({
      submit: {
        step: 'QUEUED',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'repo_month_cap', note: 'The repo took its PRs for the month.', at: NOW.toISOString() },
      },
    });
    const html = page(busy);
    const head = text(html.slice(html.indexOf('data-session-head'), html.indexOf('data-panel="agent-did"')));
    expect(head).toContain('The repo takes no more pull requests from GitRanks for now');
    expect(head).toContain("See the repo's rules");
    expect(head).not.toContain('Try again');
  });
});

describe('the session actions outside a provider', () => {
  it('reads as nothing pending: the hook gives null, a button drawn alone is on', () => {
    function Probe() {
      return <span>{String(useSessionActions())}</span>;
    }
    expect(renderToStaticMarkup(<Probe />)).toBe('<span>null</span>');
    const alone = renderToStaticMarkup(
      <MarkHandledButton prId="PR_1" prNumber={1419} kinds={['DCO']} label="I've done it" />,
    );
    expect(alone).not.toContain('disabled=""');
  });
});

describe('?move= and Also waiting', () => {
  /** The DCO and a title rule wait on the next step: two cards there. */
  const two = detail({
    ...nextForDco,
    needsYou: { since: NOW.toISOString(), signals: [signal('TITLE'), signal('DCO')] },
  });

  it('shows the held card the address names, the rest held hidden; a stale one shows the first', () => {
    search = 'session=next&move=dco';
    const named = page(two, { next: true, move: 'dco' });
    expect(named).toMatch(/<div data-held="dco">/);
    expect(named).toMatch(/<div hidden="" data-held="title">/);
    search = 'session=next&move=nope';
    const stale = page(two, { next: true, move: 'nope' });
    expect(stale).toMatch(/<div data-held="title">/);
    expect(stale).toMatch(/<div hidden="" data-held="dco">/);
  });

  it('swaps a row held here in place (a button), and links a row held elsewhere with move=', () => {
    const html = page(two, { next: true });
    const shown = html.slice(html.indexOf('<div data-held="title">'), html.indexOf('<div hidden=""'));
    expect(shown).toContain('data-also="dco"');
    expect(shown).toMatch(/data-also="dco"[\s\S]*?<button[^>]*>Open/);
    // A run's replies are another pane's: a link to it, naming the move.
    const replies = page(afterRun({ needsYou: nextForDco.needsYou }), { next: true, replies: refused(2) });
    expect(replies).toContain('href="/contribute/attempts/A_1/runs/A_F1?move=reply-failed"');
  });

  it('ends the status line with the move another session holds', () => {
    expect(text(page(nextForDco))).toContain('Your pull request is open Your move is in the next step →');
    const run = text(page(afterRun(), { replies: refused(2) }));
    expect(run).toContain('Your move is on run 1 →');
  });
});

describe('replies that did not reach GitHub', () => {
  it('says a shared organization refusal once, with Copy all, Dismiss and the way past it in Why', () => {
    const html = page(runOf({ replyDrafts: refused(7) }), { first: afterRun(), replies: refused(7) });
    const card = html.slice(html.indexOf('data-move="reply-failed"'), html.indexOf('data-panel="agent-did"'));
    const plain = text(card);
    expect(plain).toContain('Run 1 · replies not posted');
    expect(plain).toContain("Your 7 replies didn't reach GitHub");
    expect(plain).toContain('driftwood-js only lets apps it has approved post in review threads');
    expect(plain).toContain('Copy all 7');
    expect(plain).toContain('Dismiss');
    expect(plain).not.toContain('Try all again');
    expect(plain).toContain("Why can't GitRanks reply in the threads?");
    expect(card).toContain('data-org-access');
    expect(plain).toContain("See the repo's rules");
    expect(buttons(html).some((label) => label.startsWith('Approve again'))).toBe(false);
    // The rows say only "Not posted".
    expect(html.match(/data-row-state="not-posted-elsewhere"/g)).toHaveLength(7);
  });

  it('offers Try all again for a reason a retry mends', () => {
    const html = page(runOf({ replyDrafts: refused(2, 'transient') }), {
      first: afterRun(),
      replies: refused(2, 'transient'),
    });
    expect(text(html)).toContain('Try all again');
  });

  it('leaves a lone failure to its row: the card has its kind line, its title and Show it', () => {
    const one = refused(1, 'transient');
    const html = page(runOf({ replyDrafts: one }), { first: afterRun(), replies: one });
    const card = html.slice(
      html.indexOf('data-move="reply-failed"'),
      html.indexOf('</section>', html.indexOf('data-move="reply-failed"')),
    );
    expect(text(card)).toContain("Run 1 · replies not posted One reply didn't post Show it");
    expect(card).toContain('href="#comment-D_0"');
    expect(card).not.toContain('GitHub did not let us post it.');
    expect(html).toContain('data-reply-error="transient"');
  });
});

describe('replies as one comment', () => {
  const waiting = (drafts: ContributeAttemptDetail['replyDrafts']) => fixtures.waitingOf(drafts ?? []);
  const cardOf = (html: string) =>
    html.slice(
      html.indexOf('data-move="reply-failed"'),
      html.indexOf('</section>', html.indexOf('data-move="reply-failed"')),
    );

  it('leads with "Post them as one comment", Copy all from the comment’s text, and Dismiss', () => {
    const drafts = fixtures.orgRefusedOneComment();
    const html = page(runOf({ replyDrafts: drafts, ...fixtures.oneCommentPlan() }), {
      first: afterRun(),
      replies: waiting(drafts),
    });
    const card = cardOf(html);
    expect(buttons(card).slice(0, 3)).toEqual(['Post them as one comment on #1419', 'Copy all 7', 'Dismiss']);
    expect(card.match(/data-variant="default"/g)).toHaveLength(1);
    expect(text(card)).toContain("Why can't GitRanks reply in the threads?");
    // The rows keep no per-row "Post as a comment": the card posts one or more.
    expect(text(html)).not.toContain('Post as a comment instead');
    expect(html.match(/data-row-state="not-posted-elsewhere"/g)).toHaveLength(7);
  });

  it('posts a lone refused reply as a comment from the card, and shows it', () => {
    const drafts = fixtures.orgRefusedOneComment().slice(0, 1);
    const html = page(runOf({ replyDrafts: drafts, ...fixtures.oneCommentPlan(1) }), {
      first: afterRun(),
      replies: waiting(drafts),
    });
    const card = cardOf(html);
    expect(buttons(card)).toEqual(['Post it as a comment on #1419', 'Show it']);
    expect(text(html)).not.toContain('Post as a comment instead');
  });

  it('keeps an older API’s per-row "Post as a comment instead"', () => {
    const drafts = fixtures.orgRefusedRun();
    const html = page(runOf({ replyDrafts: drafts }), { first: afterRun(), replies: waiting(drafts) });
    expect(buttons(cardOf(html))).not.toContain('Post them as one comment on #1419');
  });

  it('tries a comment GitHub did not answer again, sent exactly as before', () => {
    const { drafts, plan } = fixtures.oneCommentFailed(
      'no_answer',
      'GitHub did not answer clearly, so the comment may be there already. Try again: it is sent exactly as before.',
      'RESEND',
    );
    const html = page(runOf({ replyDrafts: drafts, ...plan }), { first: afterRun(), replies: waiting(drafts) });
    const card = cardOf(html);
    expect(text(card)).toContain("Your 7 replies didn't post as one comment");
    expect(text(card)).toContain('Not posted GitHub did not answer clearly, so the comment may be there already.');
    expect(buttons(card)).toEqual(['Try again', 'Dismiss']);
    // Its rows offer no Try again of their own: the comment is tried again whole.
    expect(buttons(html).filter((label) => label.startsWith('Try again'))).toHaveLength(1);
  });

  it('builds a comment refused as invalid again, beside Copy all', () => {
    const { drafts, plan } = fixtures.oneCommentFailed(
      'invalid',
      "GitHub refused the comment as invalid. Check the replies' text, then try again.",
      'REBUILD',
    );
    const html = page(runOf({ replyDrafts: drafts, ...plan }), { first: afterRun(), replies: waiting(drafts) });
    expect(buttons(cardOf(html))).toEqual(['Try again', 'Copy all 7', 'Dismiss']);
  });

  it('offers no Try again on a comment the organization refused, nor on one the page is not served', () => {
    const { drafts, plan } = fixtures.oneCommentFailed(
      'org_restricted',
      "GitHub refused the comment too: this repository's organization keeps GitRanks Contribute from commenting here. Copy the replies and post them on the pull request yourself.",
      null,
    );
    const html = page(runOf({ replyDrafts: drafts, ...plan }), { first: afterRun(), replies: waiting(drafts) });
    expect(buttons(cardOf(html)).slice(0, 2)).toEqual(['Copy all 7', 'Dismiss']);
    expect(buttons(cardOf(html))).not.toContain('Try again');
    const unanswered = fixtures.oneCommentFailed('no_answer', 'GitHub did not answer clearly.', 'RESEND');
    const unserved = page(runOf({ replyDrafts: unanswered.drafts, ...unanswered.plan, replyBatches: [] }), {
      first: afterRun(),
      replies: waiting(unanswered.drafts),
    });
    expect(buttons(unserved)).not.toContain('Try again');
  });

  it('says replies held back once, and posts them as one comment', () => {
    const { drafts, plan } = fixtures.heldBackRun();
    const html = page(runOf({ replyDrafts: drafts, ...plan }), { first: afterRun(), replies: waiting(drafts) });
    const card = cardOf(html);
    expect(text(card)).toContain("7 replies didn't reach GitHub");
    expect(text(card)).toContain(
      "6 replies were held back: the first reply didn't reach its thread (The first reply got no answer from GitHub).",
    );
    expect(buttons(card)[0]).toBe('Post them as one comment on #1419');
    // Held back, they are not also replies to approve.
    expect(html).not.toContain('data-move="replies"');
    expect(html.match(/data-row-state="held-back"/g)).toHaveLength(6);
  });

  it('draws the rows waiting for the first reply, and the replies posted in one comment', () => {
    const waitingHtml = page(runOf({ replyDrafts: fixtures.waitingForProbe(), probeFirst: true }), {
      first: afterRun(),
      replies: waiting(fixtures.waitingForProbe()),
    });
    expect(waitingHtml.match(/data-row-state="waits-for-probe"/g)).toHaveLength(3);
    expect(text(waitingHtml)).toContain('Waits for the first reply');
    expect(waitingHtml).not.toContain('data-move="replies"');
    const postedHtml = page(runOf({ replyDrafts: fixtures.postedInOneComment() }), { first: afterRun() });
    expect(postedHtml.match(/data-row-state="posted-one-comment"/g)).toHaveLength(7);
    expect(text(postedHtml)).toContain('Posted in one comment');
  });

  it('says, under the push, that the first reply is tried in its thread first', () => {
    const blocked = text(page(fixtures.runReadyBlocked(), { first: fixtures.underWay(fixtures.runReadyBlocked()) }));
    expect(blocked).toContain(
      'GitRanks tries the first reply in its thread. If driftwood-js still blocks it, the replies go as one comment on #1419.',
    );
    expect(blocked).toContain('if the replies post in their threads');
    const first = text(
      page(fixtures.runReadyFirstInOrg(), { first: fixtures.underWay(fixtures.runReadyFirstInOrg()) }),
    );
    expect(first).toContain('If driftwood-js blocks it, the replies go as one comment on #1419.');
    // A personal account's run, or an API that does not say: no line.
    expect(text(page(fixtures.runInReview(), { first: fixtures.underWay(fixtures.runInReview()) }))).not.toContain(
      'GitRanks tries the first reply',
    );
  });
});

describe('a maintainer’s stop', () => {
  it('hides every control that writes to the pull request, says nothing per control, keeps the rest', () => {
    const pages = [
      page(nextForRun, { next: true, prNotes: stop }),
      page(followUpAttempts.review, { first: { ...followUpAttempts.underWay }, prNotes: stop }),
      page(nextForDco, { next: true, prNotes: stop }),
      page(runOf({ replyDrafts: refused(2, 'transient') }), {
        first: afterRun(),
        replies: refused(2, 'transient'),
        prNotes: stop,
      }),
      page(
        detail({
          ...nextForDco,
          needsYou: null,
          prIssues: [{ kind: 'TITLE', check: 'semantic', message: 'Retitle', suggestion: 'fix: a title' }],
        }),
        { next: true, prNotes: stop },
      ),
      page(nextForProof.review, { next: true, prNotes: stop }),
    ];
    for (const html of pages) {
      const plain = text(html);
      const drawn = buttons(html);
      for (const control of [
        'Start run',
        'Push and reply',
        'Push the commits',
        'Discard run',
        'Post the replies',
        'Try all again',
        'Sign off and push',
        'Retitle to',
        'Fix it',
        'Post the proof',
      ]) {
        expect(drawn.some((label) => label.startsWith(control))).toBe(false);
      }
      expect(plain).not.toContain("Also resolve people's threads");
      expect(plain).not.toContain('Not available');
      expect(html.match(/data-pr-stopped=""/g)).toHaveLength(1);
    }
    // Without the stop the same page draws them: the check above is not vacuous.
    expect(buttons(page(nextForRun, { next: true }))).toContain('Start run 2');
    expect(buttons(page(nextForDco, { next: true }))).toContain('Sign off and push');
    const next = page(nextForRun, { next: true, prNotes: stop });
    expect(text(next)).toContain('Next step Your move');
    expect(text(next)).toContain('A reviewer asked for changes. Answer them on GitHub.');
    // Stop and review and the first attempt's Discard are not ours to hold back.
    const countdown = page(followUp({ state: 'PENDING_AUTOSUBMIT', autosubmitAt: '2026-10-28T12:42:00.000Z' }), {
      first: { ...followUpAttempts.underWay },
      prNotes: stop,
    });
    expect(text(countdown)).toContain('Stop and review');
    expect(text(page(decisionAttempts.went, { prNotes: stop }))).toContain('Discard');
  });
});

describe('the next step’s cards and lines', () => {
  it('makes "Keep it open" the main button on the repo-out and silent cards', () => {
    for (const html of [page(nextForRepoOut, { next: true }), page(nextForSilent, { next: true })]) {
      expect(visiblePrimaries(html)[0]).toMatch(/data-variant="default"/);
      expect(html).toMatch(/data-variant="default"[^>]*>Keep it open/);
    }
  });

  it('draws each proof stage that waits for the user as a card, the rest as a line', () => {
    const connected: ContributeView = {
      ...views.active,
      ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken({ lastUsedAt: NOW.toISOString() })] },
    };
    const unreadable = {
      ...nextForProof.review,
      proof: { ...nextForProof.review.proof!, session: proofSession({ state: 'REVIEW', result: null }) },
    };
    const cards: [ContributeAttemptDetail, ContributeView, string][] = [
      [nextForProof.notConnected, views.active, 'proof'],
      [nextForProof.connected, connected, 'proof'],
      [nextForProof.review, views.active, 'proof-review'],
      [nextForProof.cannot, views.active, 'proof-review'],
      [nextForProof.fixBroken, views.active, 'proof-review'],
      [unreadable, views.active, 'proof-review'],
      [nextForProof.failed, views.active, 'proof-failed'],
    ];
    for (const [first, view, kind] of cards) {
      expect(page(first, { next: true, view })).toContain(`data-move="${kind}"`);
    }
    const lines = [
      [nextForProof.working, 'proof-working'],
      [
        {
          ...nextForProof.posted,
          proof: {
            ...nextForProof.posted.proof!,
            session: proofSession({
              state: 'POSTING',
              post: { step: 'BODY', commitSha: null, bodyAt: null, commentUrl: null, error: null },
            }),
          },
        },
        'proof-posting',
      ],
      [nextForProof.posted, 'proof-posted'],
      [
        {
          ...nextForProof.posted,
          needsYou: null,
          proof: {
            ask: null,
            session: proofSession({
              state: 'DISCARDED',
              endedReason: 'ASK_CLEARED',
              stateAt: '2026-10-28T11:00:00.000Z',
            }),
          },
        },
        'proof-ask-cleared',
      ],
    ] as const;
    for (const [first, name] of lines) {
      const html = page(first, { next: true });
      expect(html).toContain(`data-status="${name}"`);
      expect(html).not.toContain('data-move="proof');
    }
  });

  it('renders both the proof’s card and the next step’s, one hidden', () => {
    const both = detail({
      ...nextForProof.review,
      needsYou: { since: NOW.toISOString(), signals: [...nextForProof.review.needsYou!.signals, signal('DCO')] },
    });
    const html = page(both, { next: true });
    expect(html).toContain('data-move="proof-review"');
    expect(html).toContain('data-move="dco"');
    expect(html.match(/<div hidden="" data-held=/g)).toHaveLength(1);
  });

  it('says nothing waits, the run one disclosure away; under a user move the disclosure rides along', () => {
    const quiet = page(followUpAttempts.quiet, { next: true });
    expect(text(quiet)).toContain('Nothing waits on #1419');
    expect(quiet).toContain('data-start-anyway=""');
    expect(visiblePrimaries(quiet)).toHaveLength(0);
    const found = page(nextForYou, { next: true });
    expect(found.indexOf('data-start-anyway')).toBeGreaterThan(found.indexOf('data-move="found"'));
    const proof = page(nextForProof.working, { next: true });
    expect(proof.indexOf('data-start-anyway')).toBeGreaterThan(proof.indexOf('data-status-details'));
  });

  it('holds the next-run Start to the 20-comment limit, and starts with every thread ignored', () => {
    const many = Array.from({ length: 22 }, (_, index) =>
      feedbackThread({ commentId: `C_${index}`, threadId: `T_${index}` }),
    );
    const over = page(detail({ ...nextForRun, reviewFeedback: { readAt: null, threads: many } }), { next: true });
    expect(text(over).match(/A run takes 20 comments at most\. Set 2 to Ignore/g)).toHaveLength(1);
    expect(over.indexOf('data-start-limit')).toBeLessThan(over.indexOf('data-panel="review-comments"'));
    expect(text(over)).not.toContain('Start run 2');
    const ignored = page(
      detail({ ...nextForRun, reviewFeedback: { readAt: null, threads: [feedbackThread({ ignored: true })] } }),
      { next: true },
    );
    expect(ignored).toContain('data-start="next-run"');
    expect(ignored).toMatch(/<button[^>]*data-variant="default"[^>]*type="button">Start run 2/);
    expect(ignored).not.toContain('data-start-disabled');
  });

  it('keeps Push off with its reason when there is nothing to push or post', () => {
    const empty = followUp({
      patch: null,
      checkStatus: { status: 'PASSED', note: '' },
      replyDrafts: [flowDraft({ outcome: 'NEEDS_YOU', text: '' })],
    });
    const html = page(empty);
    expect(html).toContain('data-push-disabled=""');
    expect(text(html)).toContain('Tick a reply to post, or discard the run');
  });

  it('makes Discard run the main move when the branch moved, with no "again"', () => {
    const moved = followUp({
      submit: {
        step: 'PUSH',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'branch_conflict', note: 'Someone pushed to the branch.', at: NOW.toISOString() },
      },
    });
    const html = page(moved);
    expect(html).toMatch(/data-variant="destructive"[^>]*>Discard run/);
    expect(text(html)).not.toMatch(/ again\b/);
  });

  it('draws the comments under the head, outside it, whatever card the head shows', () => {
    const threads = { readAt: null, threads: [feedbackThread()] };
    for (const first of [
      detail({ ...nextForRun, reviewFeedback: threads }),
      detail({ ...nextForProof.review, reviewFeedback: threads }),
      detail({ ...nextForDco, needsYou: { since: '', signals: [signal('TITLE')] }, reviewFeedback: threads }),
    ]) {
      const html = page(first, { next: true });
      const head = html.indexOf('data-session-head');
      const list = html.indexOf('data-panel="review-comments"');
      expect(list).toBeGreaterThan(head);
      // Not inside the head: the head's markup closes before the list opens.
      const headHtml = html.slice(head, list);
      expect(headHtml).not.toContain('data-panel="review-comments"');
      expect(html.slice(list)).not.toContain('data-session-head');
    }
  });
});

describe('where ?session=next goes', () => {
  it('shows the next step only when it has something to show', () => {
    const model = (first: ContributeAttemptDetail) => contributionMovesOf({ view: views.active, first, now: NOW });
    expect(nextPaneShows(model(nextForRun), nextForRun)).toBe(true);
    expect(nextPaneShows(model(followUpAttempts.quiet), followUpAttempts.quiet)).toBe(true);
    const hand = detail({ ...followUpAttempts.quiet, openedBy: 'HAND' });
    expect(nextPaneShows(model(hand), hand)).toBe(false);
  });

  const view = async (first: ContributeAttemptDetail, query: Record<string, string>) => {
    vi.mocked(data.loadContribute).mockResolvedValue(views.active);
    vi.mocked(data.loadAttempt).mockImplementation(async (id: string) =>
      id === first.attemptId ? first : (followUp({ attemptId: id }) as never),
    );
    return FirstSessionView({ params: Promise.resolve({ id: first.attemptId }), searchParams: Promise.resolve(query) });
  };

  it('goes to the run under way, keeping the move', async () => {
    const underWay = detail({ ...nextForRun, followUps: followUps({ used: 1, currentAttemptId: 'A_F2' }) });
    await expect(view(underWay, { session: 'next', move: 'run-ready' })).rejects.toThrow(
      'REDIRECT /contribute/attempts/A_8/runs/A_F2?move=run-ready',
    );
  });

  it('goes to the first attempt on a merged pull request, or with nothing there', async () => {
    const merged = detail({ ...nextForRun, state: 'MERGED', pullRequest: pullRequest({ state: 'MERGED' }) });
    await expect(view(merged, { session: 'next' })).rejects.toThrow('REDIRECT /contribute/attempts/A_8');
    const hand = detail({ ...followUpAttempts.quiet, openedBy: 'HAND' });
    await expect(view(hand, { session: 'next' })).rejects.toThrow('REDIRECT /contribute/attempts/A_1');
  });

  it('stays on the next step when something is there', async () => {
    const element = await view(nextForRun, { session: 'next' });
    expect(element).toBeTruthy();
  });
});

describe('fixes from the review', () => {
  it('falls back to the next step’s line when a stop holds the proof back, its tile neutral', () => {
    const html = page(nextForProof.review, { next: true, prNotes: stop });
    expect(html).toContain('data-session-head="status"');
    expect(html).not.toContain('data-move="proof-review"');
    const model = contributionMovesOf({ view: views.active, first: nextForProof.review, prNotes: stop, now: NOW });
    expect(model.sessions.proof?.pill).toEqual({ label: 'Stopped', tone: 'neutral' });
  });

  it('ends the proof’s line with the move another session holds, its own link in Details', () => {
    const working = detail({
      ...nextForProof.working,
      followUps: followUps({ used: 1, history: [followUpRun({ attemptId: 'A_OC1' })] }),
    });
    const replies = refused(2).map((reply) => ({ ...reply, prId: 'PR_OC', attemptId: 'A_OC1' }));
    const html = page(working, { next: true, replies });
    expect(html).toContain('data-status="proof-working"');
    const line = text(html.slice(html.indexOf('data-session-head='), html.indexOf('data-status-details')));
    expect(line).toContain('Your move is on run 1 →');
    expect(line).not.toContain('Take it back');
    expect(text(html)).toContain('Take it back');
  });

  it('draws the rider once under the held cards, not per card', () => {
    const html = page(proofAndDco(), { next: true });
    expect((html.match(/data-held="/g) ?? []).length).toBe(2);
    expect((text(html).match(/Start a run anyway/g) ?? []).length).toBe(1);
    expect(html).toContain('data-head-rider=""');
  });

  it('shows a failed "Start a run anyway" under its own button, open, and not in the card', () => {
    const error = { source: 'start' as const, key: 'anyway', text: 'Contributing is paused.' };
    for (const html of [
      page(followUpAttempts.quiet, { next: true, seed: { error } }),
      page(nextForYou, { next: true, seed: { error } }),
    ]) {
      expect((text(html).match(/Contributing is paused\./g) ?? []).length).toBe(1);
      expect(html).not.toContain('data-move-error="start"');
      expect(html).toContain('data-start="anyway"');
    }
    // A start from a card is the card's to say.
    const fromCard = page(nextForRun, { next: true, seed: { error: { ...error, key: 'next-run' } } });
    expect(fromCard).toContain('data-move-error="start"');
  });

  it('shows a discard’s error in the card while its dialog is closed', () => {
    const run = followUpAttempts.review;
    const html = page(run, {
      first: followUpAttempts.underWay,
      seed: { error: { source: 'discard-run', text: 'Not now.' } },
    });
    expect(html).toContain('data-move-error="discard-run"');
    const first = page(decisionAttempts.went, { seed: { error: { source: 'discard-attempt', text: 'Not now.' } } });
    expect(first).toContain('data-move-error="discard-attempt"');
  });

  it('offers "Allow GitHub access again" once on replies refused for want of access', () => {
    const view: ContributeView = { ...views.active, grant: { connected: false, login: null }, grantAvailable: true };
    const replies = refused(2, 'grant_revoked');
    const html = page(runOf({ replyDrafts: replies }), { view, first: afterRun(), replies });
    expect(buttons(html).filter((label) => label === 'Allow GitHub access again')).toHaveLength(1);
  });

  it('lists a discard-comment and a send-back error on a run waiting for GitHub access', () => {
    const view: ContributeView = { ...views.active, grant: { connected: false, login: null }, grantAvailable: true };
    const run = followUp({
      submit: {
        step: 'PUSH',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_missing', note: 'No access.', at: '2026-10-28T11:30:00.000Z' },
      },
    });
    const first = detail({ ...afterRun(), followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) });
    for (const source of ['discard', 'send-back'] as const) {
      const html = page(run, { view, first, current: run, seed: { error: { source, text: 'Not now.' } } });
      expect(html).toContain('data-move="grant"');
      expect(html).toContain(`data-move-error="${source}"`);
    }
  });
});
