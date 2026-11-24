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
  loadContributeEmailSettings: vi.fn(async () => null),
  loadScheduleCounts: vi.fn(async () => undefined),
  loadProfileLanguages: vi.fn(async () => []),
  viewerLogin: vi.fn(async () => 'octocat'),
}));
vi.mock('@/lib/workspace/contribute.data', () => reads);
vi.mock('@/lib/workspace/gate.data', () => ({}));
const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'gr_last_bar' && jar.value ? { value: jar.value } : undefined),
  }),
}));
const learnReads = vi.hoisted(() => ({
  loadLearnEmailSettings: vi.fn(async () => null),
  loadLearnSetupForSettings: vi.fn(async () => null),
}));
vi.mock('@/lib/learn/settings.data', () => learnReads);
vi.mock('@/lib/learn/settings.actions', () => ({ saveLearnEmailSettingsAction: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
}));
const skillsReads = vi.hoisted(() => ({ loadSkillsMine: vi.fn(async (): Promise<unknown> => null) }));
vi.mock('@/lib/skills/skills.data', () => skillsReads);
vi.mock('@/app/profile/[login]/components/skills-hidden.actions', () => ({ setSkillsHiddenAction: vi.fn() }));

const { SettingsScreen, SettingsView } = await import('./settings-view');
const { KeyScreen, KeyView } = await import('@/app/(workspace)/my/agent/components/agent-pages');
const { PullRequestsSettingsScreen } = await import('./settings-pages');
const { SettingsAnchors } = await import('@/components/workspace/settings/settings-anchors');
const { contributor, email, limits, settingsViews, views } = await import(
  '@/lib/contribute/__fixtures__/contribute-views'
);
const { learnEmail } = await import('@/lib/learn/__fixtures__/settings');
const { setupGuessed, setupSaved, setupWorking } = await import('@/lib/learn/__fixtures__/setup');

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
      email={email.on}
      learnSetup={setupSaved}
      learnEmail={learnEmail.device}
      openPrs={3}
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

/** The page's groups by their anchors, in the order they come, Delete left out. */
const groupsOf = (html: string) =>
  [...html.matchAll(/<section id="([a-z-]+)"/g)].map((match) => match[1]).filter((id) => id !== 'danger');

/** Email's rows by their marks, in the order they come. */
const emailRowsOf = (html: string) => [...html.matchAll(/data-email-row="([a-z-]+)"/g)].map((match) => match[1]);

describe('the Settings page (page 23)', () => {
  it('from Contribute: Contribute preferences, Agent and GitHub, Limits, Email, Learn preferences, Delete last', () => {
    const { html, plain } = render();
    expect(groupsOf(html)).toEqual([
      'contribute-preferences',
      'agent-github',
      'pr-limits',
      'email',
      'learn-preferences',
    ]);
    expect(html.indexOf('id="learn-preferences"')).toBeLessThan(html.indexOf('id="danger"'));
    expect(emailRowsOf(html)).toEqual(['needs-you', 'ended', 'lessons-to-repeat', 'time-zone']);
    expect(plain).toContain('GitHub access public_repo, as @octocat Edit');
    expect(plain).toContain('Open pull requests at a time Up to 3 · 3 open now Edit');
    expect(plain).toContain('Repos can ask for less: their rules lower these limits for their pull requests.');
    expect(plain).toContain('Languages and level Rust first · also Python and Go · Some experience Edit');
    expect(html).toMatch(/href="\/learn\/setup"/);
    // The old goal row and the line that sent everything to the Agent tab are gone.
    expect(html).not.toContain('href="/my/settings/goal"');
    expect(html).not.toContain('data-agent-line');
    expect(plain).not.toContain('For learning');
  });

  it("from Learn: Learn preferences, Email with Learn's switch first, Agent and GitHub, Limits, Contribute preferences", () => {
    const { html } = render({ bar: 'learn' });
    expect(groupsOf(html)).toEqual([
      'learn-preferences',
      'email',
      'agent-github',
      'pr-limits',
      'contribute-preferences',
    ]);
    expect(emailRowsOf(html)).toEqual(['lessons-to-repeat', 'needs-you', 'ended', 'time-zone']);
  });

  it('shows a learner Learn first and no Contribute preferences', () => {
    const learner = render({ view: settingsViews.learner, bar: 'learn' });
    expect(groupsOf(learner.html)).toEqual(['learn-preferences', 'email', 'agent-github', 'pr-limits']);
    expect(learner.plain).toContain(
      'Removes your agent tokens, the GitHub access, your settings, and your attempts and lessons.',
    );
    expect(learner.plain).toContain('Attempts at a time 1 issue in work at once Edit');
  });

  it('names the agent connected last and when, the hosted one, or none with the connect steps', () => {
    const own = render().html;
    const row = own.slice(own.indexOf('data-row="agent"'), own.indexOf('</li>', own.indexOf('data-row="agent"')));
    expect(text(row)).toContain('AI agent');
    expect(row).toMatch(/href="\/my\/agent"/);
    const none = render({ view: { ...views.noKey, ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] } } });
    expect(none.plain).toContain('AI agent No agent connected yet. An agent is what fixes an issue for you. Connect');
    expect(none.html).toMatch(/href="\/my\/agent\/connect"/);
  });

  it('says the agent did not load when its read failed, with Edit to the Agent tab, never that none is connected', () => {
    const { html, plain } = render({ view: { ...views.noKey, ownAgent: undefined } });
    expect(html).toContain('data-agent="failed"');
    expect(plain).toContain("AI agent Your agent didn't load. Reload the page to try again. Edit");
    expect(plain).not.toContain('No agent connected yet');
    expect(html).toMatch(/data-row="agent"[^>]*><a[^>]*href="\/my\/agent"/);
    expect(html).not.toMatch(/href="\/my\/agent\/connect"/);
  });

  it('names the Claude key in Delete with one, and the attempts and lessons', () => {
    expect(render().plain).toContain(
      'Removes your Claude key, your agent tokens, the GitHub access, your settings, and your attempts and lessons.',
    );
  });

  it('says the limits start when the agent connects, before the API has settings', () => {
    const view = { ...views.noKey, sides: { contribute: true, learn: false } };
    const { html, plain } = render({ view });
    expect(plain).toContain('These start when your agent connects');
    expect(html).not.toContain('data-row="open"');
    expect(html).not.toContain('data-row="dco"');
  });

  it('says a limit set for the account, with no Edit', () => {
    const set = { ...views.active, contributor: contributor({ limits: limits.openPrsSet }) };
    const row = render({ view: set }).html;
    const open = row.slice(row.indexOf('data-row="open"'), row.indexOf('</li>', row.indexOf('data-row="open"')));
    expect(text(open)).toContain('Set for your account by GitRanks.');
    expect(open).not.toContain('href=');
  });

  it("says what you work on didn't load, and Learn's setup and emails that didn't", () => {
    const { html, plain } = render({
      set: undefined,
      setFailed: true,
      learnSetup: null,
      learnSetupFailed: true,
      learnEmail: null,
      learnEmailFailed: true,
    });
    expect(plain).toContain("What you work on Your lists didn't load.");
    expect(plain).toContain("Languages and level Your languages and level didn't load.");
    expect(emailRowsOf(html)).toEqual(['needs-you', 'ended', 'learn-failed']);
  });

  it('marks our guess and sends it to Set up Learn to check, and says while the profile is read', () => {
    expect(render({ learnSetup: setupGuessed }).plain).toContain(
      'Languages and level Our guess Go first · also Python · Experienced developer. Learn uses this guess until you save it. Check and save',
    );
    expect(render({ learnSetup: setupWorking }).plain).toContain(
      'We are reading your public GitHub profile. It takes a few seconds. Set up Learn',
    );
  });

  it("says the time zone from the device, the one chosen, and New York's when none is known", () => {
    expect(render({ email: { ...email.on, timeZone: 'Europe/Lisbon' } }).plain).toContain(
      'Time zone Daily emails come in the morning, Lisbon time. Taken from your device. Lisbon (UTC+0)',
    );
    expect(render({ learnEmail: learnEmail.chosen }).plain).toContain(
      'Daily emails come in the morning, Berlin time. You chose it, so it no longer follows your device. Berlin (UTC+1)',
    );
    expect(render({ email: email.off, learnEmail: learnEmail.unknown }).plain).toContain(
      'We could not tell your time zone, so daily emails come in the morning, New York time. Change it if you are elsewhere.',
    );
    // The Time zone row says the zone: the daily summary's line does not repeat it.
    expect(render({ email: email.daily }).plain).toContain('One summary a day at 8:00 in the morning, while something');
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

  it.each([
    ['#for-learning', 'learn-preferences'],
    ['#for-contributing', 'contribute-preferences'],
    ['#pull-requests', 'pr-limits'],
    ['#email', 'email'],
  ])('scroll %s to the group it is now, %s', async (hash, id) => {
    const group = document.createElement('section');
    group.id = id;
    group.scrollIntoView = vi.fn();
    document.body.append(group);
    window.history.replaceState(null, '', `/my/settings${hash}`);
    await act(async () => root.render(<SettingsAnchors />));
    expect(group.scrollIntoView).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    group.remove();
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

  it("puts Learn's groups first from Learn's link, else from the bar seen last, else for someone who only learns", async () => {
    learnReads.loadLearnEmailSettings.mockResolvedValue(learnEmail.device as never);
    learnReads.loadLearnSetupForSettings.mockResolvedValue(setupSaved as never);
    reads.loadContribute.mockResolvedValue(settingsViews.both);
    const first = async (query: Record<string, string> = {}) =>
      groupsOf(renderToStaticMarkup(await SettingsView(params(query))))[0];
    try {
      expect(await first()).toBe('contribute-preferences');
      expect(await first({ from: 'learn' })).toBe('learn-preferences');
      jar.value = 'learn';
      expect(await first()).toBe('learn-preferences');
      jar.value = 'contribute';
      expect(await first()).toBe('contribute-preferences');
      jar.value = undefined;
      reads.loadContribute.mockResolvedValue(settingsViews.learner);
      expect(await first()).toBe('learn-preferences');
      expect(learnReads.loadLearnEmailSettings).toHaveBeenCalledWith('octocat');
    } finally {
      jar.value = undefined;
    }
  });

  it("puts Privacy, with who can see the person's Skills page, after every other group and before Delete", async () => {
    const { skillsMine } = await import('@/lib/skills/__fixtures__/skills');
    reads.loadContribute.mockResolvedValue(settingsViews.both);
    skillsReads.loadSkillsMine.mockResolvedValueOnce(skillsMine.publicLearner);
    const html = renderToStaticMarkup(await SettingsView(params()));
    expect(groupsOf(html).at(-1)).toBe('privacy');
    expect(html.indexOf('id="privacy"')).toBeLessThan(html.indexOf('id="danger"'));
    expect(text(html)).toContain('Your Skills page Everyone can see it.');
    expect(html).toContain('href="/profile/octocat/skills"');
    expect(skillsReads.loadSkillsMine).toHaveBeenCalledWith('octocat');
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
