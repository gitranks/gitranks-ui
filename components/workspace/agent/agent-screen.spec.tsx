import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/agent',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
const reads = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  loadContributeActivity: vi.fn(async () => null),
  loadContributeSetup: vi.fn(),
  loadProviderInterests: vi.fn(async () => []),
  loadLearnOpen: vi.fn(async () => true),
  loadRuns: vi.fn(),
}));
vi.mock('@/lib/workspace/contribute.data', () => reads);
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: reads.loadLearnOpen }));
vi.mock('@/lib/workspace/runs.data', () => ({ loadRuns: reads.loadRuns }));

const { AgentScreen } = await import('./agent-screen');
const { AgentView } = await import('./agent-view');
const { agentTabViews, NOW, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { learnerPageOf, previewPageOf, pageOf, NO_GO, OWN_LEARN } = await import('@/lib/contribute/__fixtures__/runs');
const { activityOf, WORKING } = await import('@/lib/contribute/__fixtures__/agent-runs');

import type { ComponentProps } from 'react';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const render = (props: Partial<ComponentProps<typeof AgentScreen>> = {}) => {
  const html = renderToStaticMarkup(
    <AgentScreen view={agentTabViews.both} learnOpen runs={previewPageOf()} now={NOW} {...props} />,
  );
  return { html, plain: text(html) };
};

describe('the Agent tab, both agents set up', () => {
  it('says who does the work, then the own agent, the hosted agent and the runs, in that order', () => {
    const { html, plain } = render();
    expect(plain).toContain(
      'Agent Who does the work: your own agent on your computer, or the hosted agent on your Claude key.',
    );
    const order = ['id="own-agent"', 'id="hosted-agent"', 'id="runs"'].map((id) => html.indexOf(id));
    expect(order.every((at) => at > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('shows each connection of the own agent, and says it serves both sides', () => {
    const { html, plain } = render();
    expect(plain).toContain('Your own agent For Contribute and Learn');
    expect(plain).toContain('Claude Code on macOS Connected Last call 3 hours ago · token gr_…Qx9z');
    expect(plain).toContain('Revoke Claude Code on macOS');
    expect(html).toMatch(/href="\/my\/agent\/connect"[^>]*>Connect another agent/);
    expect(html).toContain('href="/contribute/mcp"');
    // Without Learn open, Contribute alone.
    expect(render({ learnOpen: false }).plain).toContain('Your own agent For Contribute ');
  });

  it("holds the hosted agent's control slot, its three rows with Edit, what repos can ask, and what is coming", () => {
    const { html, plain } = render();
    expect(plain).toContain('Hosted agent Contribute only');
    // Today's two controls in the slot, at their old anchors.
    expect(html).toContain('id="pause"');
    expect(plain).toContain('New attempts Active Next attempt in 2 hours.');
    expect(plain).toContain('Pause contributing');
    expect(html).toContain('id="autopilot"');
    expect(plain).toContain('Claude API key …k3Qa · works Edit');
    expect(plain).toContain(
      'Model and effort Claude Sonnet 5.5, medium effort · PRs up to 400 lines, 15 files · 3 open at a time Edit',
    );
    expect(plain).toContain(
      'Budget and pacing $63.40 of $200 used this cycle · renews Nov 14 · up to $5 an attempt Edit',
    );
    expect(html).toMatch(/<meter[^>]*aria-label="Spent this cycle"[^>]*max="200"[^>]*value="63.4"/);
    for (const page of ['/my/agent/key', '/my/agent/model', '/my/agent/budget']) {
      expect(html).toContain(`href="${page}"`);
    }
    expect(html).toContain('data-repo-rules-note');
    expect(plain).toContain('Coming soon for the hosted agent: your ChatGPT plan');
  });

  it('says a paused agent in its status line, with Resume, and no notice of its own', () => {
    const paused = { ...agentTabViews.both, ...views.paused, ownAgent: agentTabViews.both.ownAgent };
    const { html, plain } = render({ view: paused });
    expect(plain).toContain('New attempts Paused No new attempt starts until you resume.');
    expect(plain).toContain('Resume contributing');
    expect(html).not.toContain('data-notice="paused"');
  });

  it('previews the latest runs: the four tiles, the reference line, the Learn pill, the outcome and the cost', () => {
    const { html, plain } = render();
    expect(html).toMatch(/href="\/my\/agent\/runs"[^>]*>All runs →/);
    expect(plain).toContain('Every run an agent made for you, all time. Times are UTC.');
    expect(plain).toMatch(/Runs 26 6 didn't start Spent \$2\.35 \$0\.12 a started run/);
    expect(plain).toContain('Pull requests 5 3 open · 1 merged');
    expect(plain).toContain('No-go rate 65% 13 of 20 started');
    expect(plain).toContain('Issue and agent Outcome Cost');
    expect(html).toContain('href="https://github.com/can1357/oh-my-pi/issues/16734"');
    expect(html).toContain('href="https://github.com/tidewave/tide/pull/2207"');
    // The Learn run carries the pill, and the own agent's run costs nothing through us.
    const learnRow = html.slice(html.indexOf(`data-run="${OWN_LEARN.attemptId}"`));
    expect(text(learnRow.slice(0, learnRow.indexOf('</tr>')))).toMatch(
      /tidewave\/tide Issue #958 ↗ \(opens GitHub\) PR #2207 ↗ \(opens GitHub\) Learn Dark mode toggle flashes on first load Your own agent · Claude Code · first attempt · Oct 31, 16:20 .* —/,
    );
    expect(plain).toContain('Hosted · Opus 5.5 · first attempt · Oct 31, 22:35');
    expect(plain).toContain('↳ follow-up');
    expect(html).toContain(`href="/my/pull-requests/by-attempt/${NO_GO.attemptId}"`);
  });

  it('never grows past five runs', () => {
    const many = previewPageOf({
      items: Array.from({ length: 8 }, (_, at) => ({ ...NO_GO, attemptId: `R_${at}` })),
    });
    const { html } = render({ runs: many });
    const table = html.slice(
      html.indexOf('data-runs-preview'),
      html.indexOf('</table>', html.indexOf('data-runs-preview')),
    );
    expect(table.match(/data-run="/g)).toHaveLength(5);
  });
});

describe('the Agent tab, by who uses it (W1 §9.4)', () => {
  it('shows a contributor with their own agent alone what the hosted agent is, and the key to start it', () => {
    const { html, plain } = render({ view: agentTabViews.ownOnly, learnOpen: false });
    expect(html).toContain('data-hosted="pitch"');
    expect(plain).toContain('Where it runs');
    expect(plain).toContain('What it costs');
    expect(html).toMatch(/href="\/my\/agent\/key"[^>]*>Use a Claude key/);
    expect(plain).not.toContain('Budget and pacing');
  });

  it('keeps Pause, Resume and autopilot for every contributor, with or without a key, at their old anchors', () => {
    for (const view of [agentTabViews.ownOnly, agentTabViews.learner]) {
      const { html, plain } = render({ view, runs: learnerPageOf() });
      expect(html).toContain('id="pause"');
      expect(html).toContain('id="autopilot"');
      expect(plain).toContain('Pause and limits New attempts Active Your agent can start new issues.');
      expect(plain).toContain('Pause contributing');
    }
    const paused = {
      ...agentTabViews.ownOnly,
      paused: true,
      contributor: { ...agentTabViews.ownOnly.contributor, status: 'PAUSED' as const },
    };
    expect(render({ view: paused }).plain).toContain('Resume contributing');
  });

  it('links the pull request and attempts limits without a key while there are settings, and with one in the model row', () => {
    const plan = {
      ...agentTabViews.ownOnly,
      contributor: { ...agentTabViews.both.contributor, credentials: [] },
    };
    const { html, plain } = render({ view: plan });
    expect(plain).toContain('Pull requests PRs up to 400 lines, 15 files · 3 open at a time Edit');
    expect(plain).toContain('Attempts at a time 1 at a time Edit');
    expect(html).toContain('href="/my/agent/model#prs"');
    expect(html).toContain('href="/my/agent/budget#more-limits"');
    // Their own agent alone, with no settings: nothing to link.
    expect(render({ view: agentTabViews.ownOnly }).html).not.toContain('href="/my/agent/model#prs"');
    expect(render().plain).toContain(
      'Model and effort Claude Sonnet 5.5, medium effort · PRs up to 400 lines, 15 files · 3 open at a time Edit',
    );
  });

  it('closes the hosted agent to one line for a learner, opening its pitch in place, and shows no spend', () => {
    const { html, plain } = render({
      view: agentTabViews.learner,
      runs: learnerPageOf(),
      activity: activityOf(WORKING),
    });
    expect(plain).toContain(
      'Agent Who does the work: your own agent, on your computer, with the plan you already pay for.',
    );
    expect(plain).toContain('Hosted agent · for Contribute · not set up. What it is');
    expect(html).toMatch(/aria-expanded="false"[^>]*>What it is<\/button>/);
    // The pitch is there, folded, for the button to open.
    expect(html).toMatch(/<div id="[^"]+" hidden="">.*Use a Claude key/s);
    expect(plain).toContain('Every run your agent made for you. Times are UTC.');
    expect(plain).toContain('Runs 9 1 at work now');
    expect(plain).toContain('Pull requests 4 3 open · 1 merged');
    expect(plain).toContain('Lessons written 7 5 passed by you');
    expect(plain).not.toContain('Spent');
    expect(plain).not.toContain('No-go rate');
    expect(plain).toContain('Issue and agent Outcome');
    expect(plain).not.toContain('Cost');
    expect(plain.match(/ Learn /g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('asks someone with the hosted agent alone to connect their own', () => {
    const { html, plain } = render({ view: agentTabViews.hostedOnly, learnOpen: false });
    expect(plain).toContain('No agent is connected.');
    expect(html).toMatch(/href="\/my\/agent\/connect"[^>]*>Connect your agent/);
    expect(html).toContain('id="pause"');
  });

  it("puts the key's trouble above the hosted agent, and its row says it", () => {
    const { html, plain } = render({ view: agentTabViews.keyInvalid });
    const notice = html.indexOf('data-notice="key-invalid"');
    expect(notice).toBeGreaterThan(html.indexOf('id="hosted-agent"'));
    expect(notice).toBeLessThan(html.indexOf('id="pause"'));
    expect(notice).toBeGreaterThan(html.indexOf('id="own-agent"'));
    expect(plain).toContain('Claude API key …k3Qa · refused by Anthropic');
    expect(plain).toContain('New attempts Waiting');
  });

  it("puts a held account's notice on top", () => {
    const held = { ...agentTabViews.both, contributor: views.suspended.contributor };
    const { html } = render({ view: held });
    const notice = html.indexOf('data-notice="suspended"');
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(html.indexOf('id="own-agent"'));
  });

  it('says there are no runs yet, naming Learn only while it is open', () => {
    const none = pageOf({ items: [], repos: [], days: [] });
    expect(render({ runs: none }).plain).toContain('No runs yet. Start an issue on Contribute or Learn .');
    expect(render({ runs: none, learnOpen: false }).plain).toContain('No runs yet. Start an issue on Contribute .');
  });

  it("says when the runs or the connections didn't load, and the rest of the page works", () => {
    const { plain, html } = render({ runs: undefined, view: { ...agentTabViews.both, ownAgent: undefined } });
    expect(plain).toContain("The runs didn't load. Reload to try again.");
    expect(plain).toContain("Your connections didn't load. Reload to try again.");
    expect(html).toContain('id="pause"');
  });
});

describe('AgentView', () => {
  it('reads the latest five runs, all time, for the preview', async () => {
    reads.loadContribute.mockResolvedValue(agentTabViews.both);
    reads.loadRuns.mockResolvedValue(previewPageOf());
    const html = renderToStaticMarkup(await AgentView());
    expect(reads.loadRuns).toHaveBeenCalledWith({}, { size: 5 });
    expect(html).toContain('data-runs-preview');
  });
});
