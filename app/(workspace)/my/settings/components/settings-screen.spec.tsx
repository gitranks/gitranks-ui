// @vitest-environment jsdom
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }));
const workspace = vi.hoisted(() => ({ saveContributeSettings: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/my/settings',
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => workspace);
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/learn/actions', () => ({}));
const reads = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  loadContributeSetup: vi.fn(),
  loadContributeSet: vi.fn(async () => null),
  loadContributeEmail: vi.fn(async () => null),
  loadScheduleCounts: vi.fn(async () => undefined),
  loadProfileLanguages: vi.fn(async () => []),
}));
vi.mock('@/lib/workspace/contribute.data', () => reads);
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: vi.fn(async () => false) }));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadLearnOpen: vi.fn(),
}));

const { SettingsScreen, SettingsView } = await import('./settings-view');
const { KeyScreen, KeyView } = await import('@/app/(workspace)/my/agent/components/agent-pages');
const { PullRequestsSettingsScreen } = await import('./settings-pages');
const { SettingsAnchors } = await import('@/components/workspace/settings/settings-anchors');
const { contributor, email, limits, settingsViews, views } = await import(
  '@/lib/contribute/__fixtures__/contribute-views'
);
const { filledProfile } = await import('@/lib/learn/__fixtures__/profile');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const render = (props: Partial<ComponentProps<typeof SettingsScreen>> = {}) => {
  const html = renderToStaticMarkup(
    <SettingsScreen
      view={settingsViews.both}
      learnOpen
      email={email.on}
      profile={filledProfile}
      openPrs={3}
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

describe('the Settings tab (W1 §10)', () => {
  it('uses both: the pull requests, the email, For contributing then For learning, and Delete last', () => {
    const { html, plain } = render();
    expect(plain).toContain(
      'Settings How your pull requests go out and how we reach you, then what you work on and what you want to learn.',
    );
    const order = [
      'id="pull-requests"',
      'id="settings-email"',
      'id="for-contributing"',
      'id="for-learning"',
      'id="danger"',
    ].map((id) => html.indexOf(id));
    expect(order.every((at) => at > -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(plain).toContain('GitHub access public_repo, as @octocat Edit');
    expect(plain).toContain('Open pull requests at a time Up to 3 · 3 open now Edit');
    expect(plain).toContain('Repos can ask for less: their rules lower these limits for their pull requests.');
    expect(plain).toContain('For contributing For developers who want merged pull requests.');
    expect(plain).toContain('Autopilot and the hosted agent with its key and budget are on the Agent tab .');
    expect(html).not.toContain('data-list-note="paused-by-you"');
    expect(plain).toContain(
      'For learning For people who want to learn from real fixes. Goal and level TypeScript · some experience · focus: how the language works, patterns the project uses Edit',
    );
    expect(html).toContain('href="/my/settings/goal"');
    // The interim line that sent everything to the Agent tab is gone.
    expect(html).not.toContain('data-moved-to-agent');
  });

  it('offers Resume where an agent\'s "resume it at …" link lands, while the user\'s own pause holds', () => {
    const { html, plain } = render({ view: { ...settingsViews.both, paused: true, pausedByYou: true } });
    expect(plain).toContain("Contributing is paused, so your own agent can't take an issue. Resume");
    expect(html.indexOf('data-list-note="paused-by-you"')).toBeLessThan(html.indexOf('data-agent-line'));
    // A refused key's pause: the key's page says it, with no Resume here.
    expect(render({ view: { ...settingsViews.both, paused: true, pausedByYou: false } }).html).not.toContain(
      'data-list-note="paused-by-you"',
    );
  });

  it('closes For learning to a line for a contributor, and leaves it out where Learn is not open', () => {
    const contributorOnly = render({ view: settingsViews.contributor, profile: null });
    expect(contributorOnly.plain).toContain(
      'For learning · not set up. Learn teaches you a real fix before the pull request opens. How Learn works',
    );
    expect(contributorOnly.html).toMatch(/href="\/learn\/about"[^>]*>How Learn works/);
    expect(contributorOnly.plain).toContain('then what you work on.');

    const closed = render({ view: settingsViews.both, learnOpen: false, profile: null });
    expect(closed.plain).not.toContain('For learning');
    expect(closed.plain).toContain('then what you work on.');
  });

  it('puts For learning first for a learner, For contributing closed under it, and no Claude key in Delete', () => {
    const { html, plain } = render({ view: settingsViews.learner });
    expect(plain).toContain('then what you want to learn.');
    expect(html.indexOf('id="for-learning"')).toBeLessThan(html.indexOf('id="for-contributing"'));
    expect(plain).toContain(
      'For contributing · not set up. Contribute sends pull requests without a lesson. How Contribute works',
    );
    expect(html).toMatch(/href="\/contribute\?about=1"[^>]*>How Contribute works/);
    expect(plain).toContain(
      'Removes your agent tokens, the GitHub access, your settings, and your attempts and lessons.',
    );
    // A learner's own agent is bound by the same limits.
    expect(plain).toContain('Attempts at a time 1 issue in work at once Edit');
  });

  it('names the Claude key in Delete only with one, and the lessons only with Learn open', () => {
    expect(render({ learnOpen: false }).plain).toContain(
      'Removes your Claude key, your agent tokens, the GitHub access, your settings, and your attempt history.',
    );
  });

  it('says the limits start when the agent connects, before the API has settings', () => {
    const view = { ...views.noKey, sides: { contribute: true, learn: false } };
    const { html, plain } = render({ view });
    expect(plain).toContain('These start when your agent connects');
    expect(html).toMatch(/href="\/my\/agent\/connect"[^>]*>Connect your agent/);
    expect(html).not.toContain('data-row="open"');
  });

  it('says a limit set for the account, with no Edit, and a cap below the setting in words', () => {
    const set = { ...views.active, contributor: contributor({ limits: limits.openPrsSet }) };
    const row = render({ view: set }).html;
    const open = row.slice(row.indexOf('data-row="open"'), row.indexOf('</li>', row.indexOf('data-row="open"')));
    expect(text(open)).toContain('Set for your account by GitRanks.');
    expect(open).not.toContain('href=');
    expect(render({ view: views.newAccount }).plain).toContain(
      'Attempts at a time 1 issue in work at once while your account is new',
    );
  });

  it("says what you work on didn't load, and the goal that didn't", () => {
    const { plain } = render({ set: undefined, setFailed: true, profileFailed: true });
    expect(plain).toContain("What you work on Your lists didn't load.");
    expect(plain).toContain("Goal and level Your goal didn't load.");
  });
});

describe("Settings' pull requests page", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('holds the four parts at their anchors, for an account with its own agent alone too', () => {
    // Their own agent alone, no plan: the hosted agent's settings hide, these do not.
    const html = renderToStaticMarkup(<PullRequestsSettingsScreen view={settingsViews.learner} />);
    for (const id of ['size', 'open', 'attempts', 'dco']) expect(html).toContain(`id="${id}"`);
    expect(text(html)).toContain('Saving takes you back to Settings.');
    expect(html).toMatch(/href="\/my\/settings"[^>]*>.*Settings<\/a>/);
  });

  it('saves the four in one patch and goes back to Settings', async () => {
    workspace.saveContributeSettings.mockResolvedValue({ ok: true, data: settingsViews.learner.contributor.settings });
    await act(async () => root.render(<PullRequestsSettingsScreen view={settingsViews.learner} />));
    const save = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Save');
    await act(async () => save?.click());
    expect(workspace.saveContributeSettings).toHaveBeenCalledWith({
      maxChangedLines: 400,
      maxFiles: 15,
      openPrsAtATime: 3,
      attemptsAtATime: 1,
      dco: 'ASK',
    });
    expect(router.push).toHaveBeenCalledWith('/my/settings');
  });
});

describe('the old anchors', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['#pause', '/my/agent#hosted-level'],
    ['#prs', '/my/settings/pull-requests'],
    ['#more-limits', '/my/agent/budget#more-limits'],
    ['#ignored', '/my/settings/work#ignored'],
    ['#access', '/my/agent/key'],
  ])('send %s on Settings to %s', async (hash, to) => {
    window.history.replaceState(null, '', `/my/settings${hash}`);
    await act(async () => root.render(<SettingsAnchors />));
    expect(router.replace).toHaveBeenCalledWith(to);
  });

  it('on the model page, send only #prs on', async () => {
    window.history.replaceState(null, '', '/my/agent/model#prs');
    await act(async () => root.render(<SettingsAnchors only={['prs']} />));
    expect(router.replace).toHaveBeenCalledWith('/my/settings/pull-requests');
    router.replace.mockClear();
    window.history.replaceState(null, '', '/my/agent/model#agent');
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<SettingsAnchors only={['prs']} />));
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('the reads of Settings and the key page', () => {
  const params = (query: Record<string, string> = {}) => ({ searchParams: Promise.resolve(query) });

  it('opens the summary to an account with no agent yet (a learner who saved a goal comes back here)', async () => {
    reads.loadContribute.mockResolvedValue(views.newcomer);
    const html = renderToStaticMarkup(await SettingsView(params()));
    expect(text(html)).toContain('These start when your agent connects');
    expect(html).toContain('id="danger"');
  });

  it.each([
    ['the summary', () => SettingsView(params({ grant: 'refused' }))],
    ['the key page', () => KeyView(params({ grant: 'refused' }))],
  ])("sends GitHub's refused consent from %s on to GitHub's page", async (_, read) => {
    reads.loadContribute.mockResolvedValue(views.active);
    await expect(read()).rejects.toThrow('NEXT_REDIRECT /my/settings/github?grant=refused');
  });
});

describe("the key page's old #github", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it.each([
    ['with a key', views.active],
    ['without one', views.newcomer],
  ])('goes on to GitHub access in Settings, %s', async (_, view) => {
    window.history.replaceState(null, '', '/my/agent/key#github');
    await act(async () => root.render(<KeyScreen view={view} today={14} />));
    expect(router.replace).toHaveBeenCalledWith('/my/settings/github');
  });
});
