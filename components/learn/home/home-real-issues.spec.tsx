// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ lookAtIssue: vi.fn(), signInToSeeIssue: vi.fn(), skipMaskedIssue: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => actions);
const email = vi.hoisted(() => ({ setLearnIssuesEmailAction: vi.fn() }));
vi.mock('@/lib/learn/issues.actions', () => ({ ...email, readMoreLearnFixes: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn',
}));

const { HomeRealIssues } = await import('./home-real-issues');
const { LearnHomeView } = await import('./learn-home-view');
const { issueRows } = await import('@/lib/learn/__fixtures__/issues');
const { HOME_NOW, homeDay, homeSetup } = await import('@/lib/learn/__fixtures__/learn-home-page');
const { homeRealIssues, homeRealNone } = await import('@/lib/learn/__fixtures__/real-issues');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = ((query: string) => ({
  matches: true,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  for (const action of [...Object.values(actions), ...Object.values(email)]) action.mockReset();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const draw = (node: ReactNode) =>
  act(async () => {
    root.render(node);
  });
const rows = () => [...host.querySelectorAll('[data-home-issue]')];
const shownIds = () => rows().map((row) => row.querySelector('[data-masked-row]')?.getAttribute('data-masked-row'));
const within = (scope: Element | null, label: string) =>
  [...(scope?.querySelectorAll<HTMLElement>('button, a') ?? [])].find((each) => each.textContent?.trim() === label) ??
  null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No button');
    element.click();
  });

describe("Learn home's real issues", () => {
  it("lets a skipped row leave, every other row keeping its lesson line, and never takes the skip's bare next issue", async () => {
    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: maskedIssue({ id: 'zz-bare' }) });
    await draw(<HomeRealIssues fixes={[]} issues={issueRows} reads={null} now={new Date(HOME_NOW)} />);
    const [first, ...rest] = issueRows.map((row) => row.issue.id);
    const row = host.querySelector(`[data-masked-row="${first}"]`);
    await press(within(row, 'Skip'));
    await press(within(row, 'Too hard for me'));
    expect(shownIds()).toEqual(rest);
    expect(host.textContent).not.toContain('zz-bare');
    // The rows with a lesson still name it.
    expect(rows()[0].textContent).toContain(issueRows[1].lesson!.title);
  });

  it('draws the rows again when the home is drawn again with other issues', async () => {
    const home = (issues: typeof issueRows) => (
      <LearnHomeView
        home={homeDay}
        setup={homeSetup}
        now={HOME_NOW}
        timeZone={null}
        hints
        real={{ ...homeRealIssues, issues }}
      />
    );
    await draw(home(issueRows.slice(0, 2)));
    expect(shownIds()).toEqual(issueRows.slice(0, 2).map((row) => row.issue.id));
    await draw(home(issueRows.slice(2)));
    expect(shownIds()).toEqual(issueRows.slice(2).map((row) => row.issue.id));
  });
});

describe("Learn home's quiet third box", () => {
  it('turns on the email for a new issue in place, for the list with "For you" on', async () => {
    email.setLearnIssuesEmailAction.mockResolvedValue({
      ok: true,
      data: { newIssues: true, newIssuesCover: 'FOR_YOU' },
    });
    await draw(
      <LearnHomeView home={homeDay} setup={homeSetup} now={HOME_NOW} timeZone={null} hints real={homeRealNone} />,
    );
    const box = host.querySelector('[data-third-box="none"]');
    await press(within(box, 'Email me when one appears'));
    expect(email.setLearnIssuesEmailAction).toHaveBeenCalledWith(true, 'FOR_YOU');
    expect(box?.querySelector('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('on');
    expect(box?.textContent).toContain('octocat@example.com');
  });

  it('says the email needs an address when it is on without one', async () => {
    await draw(
      <LearnHomeView
        home={homeDay}
        setup={homeSetup}
        now={HOME_NOW}
        timeZone={null}
        hints
        real={{ ...homeRealNone, box: { kind: 'none', emailOn: true, emailTo: null } }}
      />,
    );
    expect(host.querySelector('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('no-address');
  });
});

describe("Learn home's email line while it waits for an address", () => {
  const fetchMock = vi.fn();
  let clock = 1_000_000;
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  const comeBack = () =>
    act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
  const answer = (email: unknown) => new Response(JSON.stringify({ email }), { status: 200 });
  const waiting = () => (
    <LearnHomeView
      home={homeDay}
      setup={homeSetup}
      now={HOME_NOW}
      timeZone={null}
      hints
      real={{ ...homeRealNone, box: { kind: 'none', emailOn: true, emailTo: null } }}
    />
  );
  const line = () => host.querySelector('[data-issues-email]')?.getAttribute('data-issues-email');

  it('reads the email again when the person comes back, once at a time, and changes the line in place', async () => {
    let land!: (response: Response) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          land = resolve;
        }),
    );
    await draw(waiting());
    expect(fetchMock).not.toHaveBeenCalled();
    await comeBack();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/me/learn/home/issues-email', { cache: 'no-store' });
    // A read in flight: no second one.
    clock += 60_000;
    await comeBack();
    expect(fetchMock).toHaveBeenCalledOnce();
    await act(async () => land(answer({ emailOn: true, emailTo: 'octocat@example.com' })));
    expect(line()).toBe('on');
    expect(host.textContent).toContain('octocat@example.com');
    // The line no longer waits: no more reads.
    clock += 60_000;
    await comeBack();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('reads at least 30 seconds apart while the address is still missing, and keeps the line on a failure', async () => {
    fetchMock.mockImplementation(async () => answer({ emailOn: true, emailTo: null }));
    await draw(waiting());
    await comeBack();
    clock += 29_000;
    await comeBack();
    expect(fetchMock).toHaveBeenCalledOnce();
    clock += 2_000;
    await comeBack();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockImplementation(async () => new Response('{}', { status: 500 }));
    clock += 31_000;
    await comeBack();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(line()).toBe('no-address');
  });

  it('reads nothing while the line does not wait for an address', async () => {
    await draw(
      <LearnHomeView home={homeDay} setup={homeSetup} now={HOME_NOW} timeZone={null} hints real={homeRealNone} />,
    );
    await comeBack();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
