import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute',
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('./live-refresh', () => ({
  LiveRefresh: ({ seconds }: { seconds?: number }) => <span data-live-refresh={seconds} />,
}));

const { OverviewScreen, overviewSectionsOf } = await import('./overview-status');
const { NeedsYouSection, RightNowSection, ImpactSection, WaysSection, UpNextSection } = await import(
  './overview-sections'
);
const { NOW, contributor, firstSpend, key, mcpToken, settings, views } = await import(
  '@/lib/contribute/__fixtures__/contribute-views'
);
const { attempt, followUpOf } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { followUpInReview, issuePage, needsNothing, nowIdle, overviewData, replyWaiting, reviewsReady } = await import(
  '@/lib/contribute/__fixtures__/contribute-overview'
);

import type { OverviewData } from './overview-status';
import type { ContributeAttempt, ContributeView } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const screen = (view: ContributeView, data: Partial<OverviewData> = {}) =>
  renderToStaticMarkup(
    <OverviewScreen view={view} sections={overviewSectionsOf(view, { ...overviewData(), ...data }, NOW)} now={NOW} />,
  );

/** Both ways set up: a key and a live token the agent has called with. */
const both: ContributeView = {
  ...views.active,
  ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })] },
};

const withSpend = (nextAttemptAt: string | null): ContributeView => ({
  ...views.active,
  contributor: contributor({ spend: { ...firstSpend, nextAttemptAt } }),
});

describe('Overview, once there is an attempt', () => {
  it('shows the sections in order, each with its heading, under the sr-only Overview', () => {
    const html = screen(views.active);
    const headings = [...html.matchAll(/<h([12])[^>]*>(.*?)<\/h\1>/g)].map(([, level, title]) => `${level}:${title}`);

    expect(headings).toEqual([
      '1:Overview',
      '2:Needs you',
      '2:Right now',
      '2:Your impact',
      '2:Ways you contribute',
      '2:Up next',
    ]);
    expect(html).toMatch(/<h1 class="sr-only">Overview<\/h1>/);
    expect(html).toMatch(/<h2 id="overview-needs" class="sr-only">Needs you<\/h2>/);
    for (const id of ['overview-needs', 'overview-now', 'overview-impact', 'overview-ways', 'overview-next']) {
      expect(html).toContain(`aria-labelledby="${id}"`);
    }
    expect(html).toMatch(/<h3[^>]*>Coming soon\.<\/h3>/);
    expect(html).toContain('data-overview="footer"');
  });

  it("leaves out today's notices, reviews ready and the cycle summary", () => {
    const html = screen(views.paused);

    expect(html).not.toContain('data-notice=');
    expect(html).not.toContain('data-reviews-ready');
    expect(text(html)).not.toContain('used this cycle');
  });

  it("says each section's failure alone, the others rendered", () => {
    const html = text(
      screen(views.active, {
        needs: { reviews: undefined, replies: undefined },
        now: { inFlight: undefined, scheduleCounts: undefined },
        impact: undefined,
        page: undefined,
      }),
    );

    expect(html).toContain("We couldn't check everything right now. My contributions →");
    expect(html).not.toContain('Nothing needs you right now');
    expect(html).toContain("We can't check your agent right now.");
    expect(html).toContain('$63.40 of $200');
    expect(html).toContain('Your totals are not available yet.');
    expect(html).toContain('Your Claude key Connected');
    expect(html).toContain('Your picks are not available right now.');
    expect(html).toContain('All picks in Issues →');
  });
});

describe('Needs you', () => {
  const needs = (view: ContributeView, read: Parameters<typeof NeedsYouSection>[0]['read']) =>
    renderToStaticMarkup(<NeedsYouSection view={view} read={read} now={NOW} />);

  it('says nothing needs the user only when every read answered', () => {
    const clear = needs(views.active, needsNothing);
    expect(clear).toContain('data-needs="clear"');
    expect(text(clear)).toContain(
      "Nothing needs you right now. A review shows up here and in My contributions the moment it's ready.",
    );

    for (const read of [
      { reviews: undefined, replies: [] },
      { reviews: [], replies: undefined },
    ]) {
      const html = needs(views.active, read);
      expect(html).toContain('data-needs="unchecked"');
      expect(text(html)).not.toContain('Nothing needs you');
      expect(html).toContain('href="/contribute/me"');
    }
  });

  it('titles the rows by their count, oldest review first, each action naming its row', () => {
    const one = needs(views.active, { reviews: [reviewsReady[0]], replies: [] });
    expect(one).toMatch(/<h2[^>]*>1 thing needs you<\/h2>/);

    const html = needs(views.active, { reviews: reviewsReady, replies: [replyWaiting()] });
    const plain = text(html);
    expect(html).toMatch(/<h2[^>]*>3 things need you<\/h2>/);
    expect(plain.indexOf('#77')).toBeLessThan(plain.indexOf('#2481'));
    expect(plain).toContain(
      'Review ready fern-lang/fern · #2481 Formatter drops a trailing comment in match arms · ready 2 hours ago · $2.36 Review',
    );
    expect(html).toContain('aria-label="Review fern-lang/fern #2481"');
    expect(html).toContain('href="/contribute/attempts/A_NEW"');
    expect(plain).toContain(
      'Reply to approve driftwood-js/driftwood · PR #1419 Your agent drafted a reply to @maintainer-mo Approve reply',
    );
    expect(html).toContain('aria-label="Approve the reply on driftwood-js/driftwood PR #1419"');
    expect(html).toContain('href="/contribute/attempts/A_F1"');
  });

  it('leaves "ready" out while reviewAt is not answered', () => {
    const unanswered = attempt({ reviewAt: undefined });
    expect(text(needs(views.active, { reviews: [unanswered], replies: [] }))).toContain(
      'Nested layouts re-render on every navigation · $2.36',
    );
    expect(text(needs(views.active, { reviews: [unanswered], replies: [] }))).not.toContain('· ready');
  });

  it("says the user's own agent made a review, in place of a cost", () => {
    const own = attempt({
      runner: 'MCP',
      agent: { name: 'CODEX', model: 'gpt-5' },
      reviewAt: '2026-10-28T11:00:00.000Z',
    });
    expect(text(needs(views.agentOnboarded, { reviews: [own], replies: [] }))).toContain(
      '· ready 1 hour ago · made by Codex',
    );
  });

  it('shows five rows, then the rest in My contributions', () => {
    const reviews = Array.from({ length: 7 }, (_, index) =>
      attempt({ attemptId: `A_${index}`, number: index, reviewAt: `2026-10-2${index}T00:00:00.000Z` }),
    );
    const html = needs(views.active, { reviews, replies: [] });

    expect(html.match(/data-row="review"/g)).toHaveLength(5);
    expect(html).toMatch(/<h2[^>]*>7 things need you<\/h2>/);
    expect(text(html)).toContain('and 2 more in My contributions →');
  });

  it("folds a follow-up's drafts into its review, and says it could not check them without the reviews", () => {
    const drafts = [replyWaiting({ inReview: true }), replyWaiting({ draftId: 'D_2', inReview: true, comment: null })];
    const folded = needs(views.active, { reviews: [followUpInReview], replies: drafts });
    expect(folded.match(/data-row=/g)).toHaveLength(1);
    expect(text(folded)).toContain('Follow-up on PR #1419 · ready 1 hour ago · $1.12, with 2 replies');

    const auto = attempt({
      attemptId: 'A_F1',
      state: 'PENDING_AUTOSUBMIT',
      kind: 'FOLLOW_UP',
      followUpOf,
      autosubmitAt: '2026-10-28T12:42:00.000Z',
    });
    expect(text(needs(views.active, { reviews: [auto], replies: drafts }))).toContain(
      'Autopilot driftwood-js/driftwood · #871 Submits in 42 minutes, with 2 replies, unless you stop it. Review',
    );

    const unread = needs(views.active, { reviews: undefined, replies: drafts });
    expect(unread).not.toContain('data-row=');
    expect(unread).toContain('data-needs="unchecked"');
  });

  it('asks for GitHub access on a bounced first submit, once, from its review', () => {
    const bounced: ContributeAttempt = attempt({
      submit: {
        step: 'FORK',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_revoked', note: 'GitHub access was revoked.', at: '2026-10-28T10:00:00.000Z' },
      },
    });
    const html = needs(views.grantMissing, { reviews: [bounced], replies: [] });

    expect(html.match(/data-row=/g)).toHaveLength(1);
    expect(text(html)).toContain(
      'GitHub access driftwood-js/driftwood · #871 GitHub access was revoked. Allow GitHub access',
    );
    expect(html).toContain('href="/contribute/attempts/A_1"');
  });

  it('asks for a new key when Anthropic refused it, and for a way when there is none', () => {
    expect(text(needs(views.keyInvalid, needsNothing))).toContain(
      'Key refused Claude key …k3Qa Anthropic refused it. Nothing starts until you connect a working one. Connect a new key',
    );
    expect(text(needs(views.onboardedNoPath, needsNothing))).toContain(
      'Not set up Nothing runs until you connect your Claude key or your own agent. Add your Claude key',
    );
    // A pause or a used-up key is a state, in Right now.
    expect(needs(views.paused, needsNothing)).toContain('data-needs="clear"');
    expect(needs(views.exhausted, needsNothing)).toContain('data-needs="clear"');
  });
});

describe('Right now', () => {
  const now = (view: ContributeView, read = nowIdle, page = issuePage) =>
    renderToStaticMarkup(<RightNowSection view={view} read={read} page={page} now={NOW} />);
  const hosted = (patch: Partial<ContributeAttempt>) => ({
    ...nowIdle,
    inFlight: [
      attempt({ state: 'RUNNING', runner: 'MANAGED_AGENTS', createdAt: '2026-10-28T11:48:00.000Z', ...patch }),
    ],
  });

  it.each([
    ['RUNNING', 'Working'],
    ['CLAIMING', 'Starting'],
    ['CHECKS', 'Checking'],
  ] as const)(
    'shows a hosted attempt in %s with a spinner, announced, and reads the page every 30s',
    (state, label) => {
      const html = now(views.active, hosted({ state }));

      expect(html).toContain('data-hosted="working"');
      expect(html).toContain('data-live-refresh="30"');
      expect(html).toMatch(
        new RegExp(
          `role="status"[^>]*><span aria-hidden="true" class="[^"]*motion-safe:animate-spin[^"]*"></span>${label}<`,
        ),
      );
      expect(text(html)).toContain(
        'driftwood-js/driftwood #871 · Nested layouts re-render on every navigation Started 12 minutes ago, on your key. It shows up under Needs you when it is ready.',
      );
    },
  );

  it('names a hosted follow-up by its pull request', () => {
    expect(text(now(views.active, hosted({ kind: 'FOLLOW_UP', followUpOf })))).toContain('Follow-up on PR #1419');
  });

  it('does not read the page again while nothing is in flight', () => {
    expect(now(views.active)).not.toContain('data-live-refresh');
  });

  it.each([
    [
      'closed',
      { ...views.active, attemptsOpen: false },
      "Waiting Contribute isn't open yet Your agent starts on one of your top picks when Contribute opens.",
    ],
    [
      'paused',
      views.paused,
      'Paused Contributing is paused No attempt starts until you resume. Your picks and settings are kept. Resume contributing',
    ],
    ['key-invalid', views.keyInvalid, 'Stopped Your Claude key stopped working'],
    [
      'key-waiting',
      views.exhausted,
      'Waiting Your credits are used up for this cycle Nothing starts until they renew on Nov 14.',
    ],
    [
      'no-room',
      withSpend(null),
      'Next attempt None can start Your caps leave no room for one attempt. Raise them in Settings →',
    ],
    ['paced', views.active, 'Next attempt In 2 hours Paced across your cycle, on one of your top picks.'],
    [
      'soon',
      withSpend('2026-10-28T11:00:00.000Z'),
      'Next attempt Soon Your agent starts on one of your top picks, usually within minutes.',
    ],
  ] as const)('says %s', (kind, view, copy) => {
    const html = now(view);
    expect(html).toContain(`data-hosted="${kind}"`);
    expect(text(html)).toContain(copy);
  });

  it('says there is no issue yet', () => {
    const html = now(withSpend('2026-10-28T11:00:00.000Z'), nowIdle, { ...issuePage, items: [] });
    expect(text(html)).toContain("Next attempt Once there's an issue for you We're still finding issues for you.");
  });

  it("says the scheduler's holds, with the way to each setting", () => {
    const agentHolds = { ...nowIdle, inFlight: [attempt({ state: 'RUNNING', runner: 'MCP' })] };
    const slots = now(both, agentHolds);
    expect(slots).toContain('data-hosted="slots-taken"');
    expect(text(slots)).toContain(
      'Waiting Your own agent holds your slot A new attempt starts when it hands back its patch or releases the issue. Attempts at a time in Settings →',
    );
    expect(slots).toContain('href="/contribute/settings/budget#more-limits"');

    const three = { ...both, contributor: contributor({ settings: { ...settings, attemptsAtATime: 3 } }) };
    const allSlots = now(three, {
      ...nowIdle,
      inFlight: [0, 1, 2].map((index) => attempt({ attemptId: `A_${index}`, state: 'RUNNING', runner: 'MCP' })),
    });
    expect(text(allSlots)).toContain('Your own agent holds all 3 of your slots');

    const cap = now(views.active, { inFlight: [], scheduleCounts: { prBound: 3, queued: 0 } });
    expect(text(cap)).toContain(
      'Waiting At your open PRs cap 3 of 3 pull requests are open or on their way. The next attempt starts when one is merged, closed or discarded. Open PRs at a time in Settings →',
    );
    expect(cap).toContain('href="/contribute/settings/agent#prs"');

    const queuedView = {
      ...views.active,
      contributor: contributor({ settings: { ...settings, pace: 'QUEUED' as const } }),
    };
    const queued = now(queuedView);
    expect(text(queued)).toContain(
      'Waiting Nothing queued Your pacing is "Only issues I queue", and none is queued. Pacing in Settings →',
    );
    expect(queued).toContain('href="/contribute/settings/budget#pacing"');
  });

  it('never says soon while a hold holds, or while the attempts in flight or the counts are not answered', () => {
    const view = withSpend('2026-10-28T11:00:00.000Z');
    for (const read of [
      { inFlight: [], scheduleCounts: { prBound: 3, queued: 0 } },
      { inFlight: undefined, scheduleCounts: { prBound: 0, queued: 0 } },
      { inFlight: [], scheduleCounts: undefined },
    ]) {
      expect(text(now(view, read))).not.toContain('usually within minutes');
    }
    expect(text(now(view, { inFlight: [], scheduleCounts: undefined }))).toContain(
      "We can't check your agent right now.",
    );
  });

  it("shows this cycle's spend for a key, with its meter", () => {
    const html = now(views.active);
    expect(text(html)).toContain('This cycle $63.40 of $200 Renews Nov 14 · the most an attempt can spend is $5.');
    expect(html).toContain('<meter class="sr-only" aria-label="Spent this cycle"');
    expect(now(views.agentOnboarded)).not.toContain('data-now="cycle"');
  });

  it("shows the user's own agent holding an issue, idle, never called and paused", () => {
    const held = attempt({
      nameWithOwner: 'quill-rs/quill',
      number: 1204,
      state: 'RUNNING',
      runner: 'MCP',
      agent: { name: 'CLAUDE_CODE', model: null },
      leaseUntil: '2026-11-01T00:00:00.000Z',
    });
    expect(text(now(views.agentOnboarded, { ...nowIdle, inFlight: [held] }))).toContain(
      'Your own agent Holding quill-rs/quill #1204 Claude Code · last call 55 minutes ago. Held for you until Nov 1.',
    );
    expect(text(now(views.agentOnboarded, { ...nowIdle, inFlight: [{ ...held, state: 'CLAIMING' }] }))).toContain(
      'Claiming quill-rs/quill #1204',
    );
    expect(text(now(views.agentOnboarded, { ...nowIdle, inFlight: [{ ...held, state: 'CHECKS' }] }))).toContain(
      'Checking the patch for quill-rs/quill #1204',
    );
    expect(
      text(
        now(views.agentOnboarded, {
          ...nowIdle,
          inFlight: [{ ...held, changesRequested: { note: 'n', at: NOW.toISOString() } }],
        }),
      ),
    ).toContain('Holding quill-rs/quill #1204 · sent back with your note');

    expect(text(now(views.agentOnboarded))).toContain(
      'Your own agent No issue held Claude Code on macOS · last call 55 minutes ago. Ask it to "Find me an issue on GitRanks".',
    );
    const fresh = { ...views.agentOnboarded, ownAgent: { paths: { hosted: false, mcp: true }, tokens: [mcpToken()] } };
    expect(text(now(fresh))).toContain("Your own agent Your agent hasn't called yet");
    expect(text(now({ ...views.agentOnboarded, paused: true }))).toContain(
      "Your own agent Contributing is paused Your agent can't claim an issue until you resume.",
    );
    // Its last call stays when the attempts in flight do not answer.
    expect(text(now(views.agentOnboarded, { ...nowIdle, inFlight: undefined }))).toContain(
      "We can't check your agent right now. Claude Code on macOS · last call 55 minutes ago.",
    );
  });

  it('shows both agents for a user with both', () => {
    const html = now(both);
    expect(html).toContain('data-now="hosted"');
    expect(html).toContain('data-now="cycle"');
    expect(html).toContain('data-now="own-agent"');
  });
});

describe('Your impact', () => {
  const impact = (totals: Parameters<typeof ImpactSection>[0]['totals']) =>
    text(renderToStaticMarkup(<ImpactSection view={views.active} totals={totals} />));

  it('shows four tiles and the way to My contributions', () => {
    expect(impact({ open: 2, merged: 7, closed: 1, reposHelped: 6 })).toBe(
      'Your impact My contributions → 7 pull requests merged 2 open, waiting on maintainers 6 repos helped 1 of 3 merged to unlock autopilot',
    );
  });

  it('reads "–" for repos helped while it is not answered, and says the totals are not available', () => {
    expect(impact({ open: 2, merged: 7, closed: 1 })).toContain('– repos helped');
    expect(impact(undefined)).toContain('Your totals are not available yet.');
  });
});

describe('Ways you contribute', () => {
  const ways = (view: ContributeView, noted: Parameters<typeof WaysSection>[0]['noted'] = []) =>
    renderToStaticMarkup(<WaysSection view={view} noted={noted} now={NOW} />);

  it('shows a connected key and a connected agent, each with the way to Settings', () => {
    const html = ways(both);
    expect(text(html)).toContain(
      'Your Claude key Connected Max 20x · ends in …k3Qa · up to $200 a month Manage in Settings →',
    );
    expect(text(html)).toContain(
      'Your own agent Connected Claude Code on macOS · 1 token live · last call 3 hours ago Manage in Settings →',
    );
    expect(html).toContain('href="/contribute/settings/keys"');
    expect(html).toContain('href="/contribute/settings/own-agent"');
  });

  it('offers each way not set up, dashed', () => {
    const html = ways(views.onboardedNoPath);
    expect(html.match(/data-way-state="Not set up"[^>]*border-dashed/g)).toHaveLength(2);
    expect(text(html)).toContain(
      "Your Claude key Not set up We run the agent on your plan's API credits, in a sandbox. About two minutes. Add your Claude key →",
    );
    expect(text(html)).toContain(
      'Your own agent Not set up Claude Code, Codex, Cursor or Gemini CLI asks GitRanks for an issue. About a minute. Connect your own agent →',
    );
    expect(html).toContain('href="/contribute/connect?path=agent"');
  });

  it('says a refused key and a waiting one, and when it cannot check the agent', () => {
    expect(ways(views.keyInvalid)).toContain('data-way-state="Refused"');
    expect(ways(views.limitReached)).toContain('data-way-state="Waiting"');
    expect(text(ways(views.active))).toContain("Your own agent We can't check your agent right now. Settings →");
  });

  it('shows the coming-soon providers compact, each with its toggle', () => {
    const html = ways(views.active, ['COPILOT']);
    expect(html).toContain('data-overview="coming-soon"');
    expect(html.match(/aria-pressed="/g)).toHaveLength(8);
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Notify me when GitHub Copilot opens"/);
    expect(text(html)).toContain("Coming soon. Tell us which you'd use; the most asked for comes first.");
    expect(text(html)).toContain("You're on the list for GitHub Copilot.");
    expect(html).toMatch(/role="status"/);
    // No kind or text line.
    expect(text(html)).not.toContain('Cloud agent');
    expect(text(html)).not.toContain('under a weekly cap you set');
  });
});

describe('Up next', () => {
  const upNext = (page: Parameters<typeof UpNextSection>[0]['page']) =>
    renderToStaticMarkup(<UpNextSection page={page} />);

  it("shows the feed's top three in rank order, each with why", () => {
    const html = upNext(issuePage);
    const plain = text(html);

    expect(html.match(/data-issue="/g)).toHaveLength(3);
    expect(plain.indexOf('#1204')).toBeLessThan(plain.indexOf('#930'));
    expect(plain.indexOf('#930')).toBeLessThan(plain.indexOf('#381'));
    expect(plain).toContain(
      'quill-rs/quill · #1204 · Rust · size M Panic when a span ends at EOF Why: you write Rust, and it has a clear reproduction',
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('href="/contribute/issues"');
    expect(plain).not.toContain('Skip');
  });

  it('says the picks are ranking, there are none yet, or they are not available', () => {
    expect(upNext({ ...issuePage, computedAt: null })).toContain('data-ranking="waiting"');
    expect(text(upNext({ ...issuePage, items: [] }))).toContain("We're still finding issues for you.");
    expect(text(upNext(null))).toContain("We're still finding issues for you.");
    expect(text(upNext(undefined))).toContain('Your picks are not available right now.');
  });
});

describe('Overview before the first attempt', () => {
  it("shows the key's guide, then Ways and the footer alone", () => {
    const view = views.firstKey;
    const html = renderToStaticMarkup(
      <OverviewScreen
        view={view}
        sections={overviewSectionsOf(view, overviewData(), NOW)}
        firstRun={{ page: issuePage }}
        now={NOW}
      />,
    );

    expect(html).toContain('data-first-run=');
    expect(html).toContain('aria-labelledby="overview-ways"');
    for (const id of ['overview-needs', 'overview-now', 'overview-impact', 'overview-next']) {
      expect(html).not.toContain(`aria-labelledby="${id}"`);
    }
    const plain = text(html);
    expect(plain.indexOf("You're in")).toBeLessThan(plain.indexOf('Ways you contribute'));
    expect(plain.indexOf('Ways you contribute')).toBeLessThan(plain.indexOf('Maintain a repo?'));
  });

  it("shows the own agent's guide and its first picks, then Ways", () => {
    const view = views.agentOnboarded;
    const html = renderToStaticMarkup(
      <OverviewScreen
        view={view}
        sections={overviewSectionsOf(view, overviewData(), NOW)}
        agentFirstRun={{ page: issuePage }}
        now={NOW}
      />,
    );

    expect(html).toContain('data-agent-next');
    expect(html).toContain('data-agent-picks="ready"');
    expect(html).toContain('aria-labelledby="overview-ways"');
    expect(html).not.toContain('aria-labelledby="overview-now"');
  });

  it('keeps every key notice out of the sections once there is an attempt', () => {
    expect(
      screen({ ...views.firstKey, contributor: contributor({ credentials: [key({ state: 'INVALID' })] }) }),
    ).toContain('data-row="key"');
  });
});

describe('the review fixes, rendered', () => {
  it('leaves the cost out of a review whose maker is unread and spent nothing, never "$0"', () => {
    const { runner: _runner, ...unread } = attempt({ costUsd: 0, reviewAt: '2026-10-28T11:00:00.000Z' });
    const html = text(
      renderToStaticMarkup(
        <NeedsYouSection view={both} read={{ reviews: [unread as ContributeAttempt], replies: [] }} now={NOW} />,
      ),
    );

    expect(html).toContain('Nested layouts re-render on every navigation · ready 1 hour ago Review');
    expect(html).not.toContain('$0');
  });

  it('shows a bounced review as a review, without the bounce note, once GitHub access is granted', () => {
    const bounced = attempt({
      submit: {
        step: 'FORK',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_missing', note: 'GitHub access is not connected.', at: '2026-10-28T10:00:00.000Z' },
      },
    });
    const html = renderToStaticMarkup(
      <NeedsYouSection view={views.active} read={{ reviews: [bounced], replies: [] }} now={NOW} />,
    );

    expect(html).toContain('data-row="review"');
    expect(html).not.toContain('data-row="grant"');
    expect(text(html)).not.toContain('not connected');
  });

  it("says it can't check either agent while whose the attempt in flight is is unread", () => {
    const { runner: _runner, ...unread } = attempt({ state: 'RUNNING' });
    const html = renderToStaticMarkup(
      <RightNowSection
        view={both}
        read={{ ...nowIdle, inFlight: [unread as ContributeAttempt] }}
        page={issuePage}
        now={NOW}
      />,
    );
    const plain = text(html);

    expect(html).toContain('data-hosted="unknown"');
    expect(html).toContain('data-own-agent="unknown"');
    expect(plain).not.toContain('No issue held');
    expect(plain).not.toContain('on your key');
    expect(html).toContain('data-live-refresh="30"');
  });

  it('never says soon while Up next is unavailable', () => {
    const html = renderToStaticMarkup(
      <RightNowSection view={withSpend('2026-10-28T11:00:00.000Z')} read={nowIdle} page={undefined} now={NOW} />,
    );

    expect(html).toContain('data-hosted="unknown"');
    expect(text(html)).not.toContain('usually within minutes');
  });
});
