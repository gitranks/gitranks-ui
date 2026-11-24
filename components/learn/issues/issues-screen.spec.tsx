// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/learn/issues' }));
const masked = vi.hoisted(() => ({ lookAtIssue: vi.fn(), signInToSeeIssue: vi.fn(), skipMaskedIssue: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => masked);
const { readMoreLearnFixes, signIn } = vi.hoisted(() => ({ readMoreLearnFixes: vi.fn(), signIn: vi.fn() }));
vi.mock('@/lib/learn/issues.actions', () => ({ readMoreLearnFixes, setLearnIssuesEmailAction: vi.fn() }));
vi.mock('next-auth/react', () => ({ signIn }));

const { IssuesScreen } = await import('./issues-screen');
const { IssuesEmail } = await import('./issues-parts');
const { ISSUES_VIEW } = await import('@/lib/learn/issues');
const { issueRows, issuesNames, learnFixes, listNone, listOutsideForYou, namedRow, personalList, views, visitorRows } =
  await import('@/lib/learn/__fixtures__/issues');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia ??= ((query: string) => ({
  matches: true,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  readMoreLearnFixes.mockReset();
  signIn.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const text = () => container.textContent ?? '';
const $ = (selector: string) => container.querySelector(selector);
const $$ = (selector: string) => [...container.querySelectorAll(selector)];
const hrefs = (selector: string) => $$(selector).map((node) => node.getAttribute('href'));

describe('Issues', () => {
  it("draws a visitor's five with their lesson lines, all new, no switch, and the sign-in under them", async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'visitor', rows: visitorRows }} />);
    expect($('main')?.getAttribute('data-issues')).toBe('visitor');
    expect($('h1')?.textContent).toBe('Real issues and fixes');
    expect($$('[data-masked-row], li')).not.toHaveLength(0);
    expect($$('[data-lesson]')).toHaveLength(4);
    expect(text()).not.toContain('which you learned');
    expect(text()).toContain('Find duplicates in one pass with a set, which is new for you.');
    expect($$('[data-issues-switch]')).toHaveLength(0);
    expect($('[data-issues-visitor-note]')?.textContent).toContain('Sign in with GitHub to see the issues that fit');
    await act(async () => ($('[data-issues-visitor-note] button') as HTMLButtonElement).click());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/issues' });
    expect(hrefs('[data-issues-foot] a')).toEqual([
      '/learn/issues.md',
      '/learn/about',
      '/contribute/maintainers#learn',
    ]);
  });

  it("opens an issue's page with the view's filters, so its way back opens this view again", async () => {
    masked.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: null } });
    await render(<IssuesScreen view={views.course} layer={{ kind: 'personal', list: personalList() }} />);
    const see = $$('button, a').find((each) => each.textContent?.trim() === 'See the full issue') as HTMLElement;
    await act(async () => see.click());
    expect(router.push).toHaveBeenCalledWith(
      expect.stringMatching(/^\/my\/issues\/[\w-]+\?from=learn&course=algorithms&learned=1$/),
    );
  });

  it("opens an issue's page from a lesson's own view with the page it is on, for its way back", async () => {
    masked.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: null } });
    await render(<IssuesScreen view={views.lesson} at="lesson" layer={{ kind: 'personal', list: personalList() }} />);
    const see = $$('button, a').find((each) => each.textContent?.trim() === 'See the full issue') as HTMLElement;
    await act(async () => see.click());
    expect(router.push).toHaveBeenCalledWith(
      expect.stringMatching(/^\/my\/issues\/[\w-]+\?from=learn&lesson=find-duplicates-with-a-set&at=lesson$/),
    );
  });

  it('links the Markdown copy for a person too', async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'personal', list: personalList() }} />);
    expect(hrefs('[data-issues-foot] a')).toEqual([
      '/learn/issues.md',
      '/learn/about',
      '/contribute/maintainers#learn',
    ]);
  });

  it('holds the sign-in back while the signed-in list is read', async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'visitor', rows: visitorRows, pending: true }} />);
    expect($('main')?.getAttribute('aria-busy')).toBe('true');
    expect($('[data-issues-visitor-note]')).toBeNull();
  });

  it('draws a person\'s five with both switches, the count of the one off, and what "For you" means', async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'personal', list: personalList() }} />);
    const switches = $$('[data-issues-switch]');
    expect(
      switches.map((node) => [node.textContent, node.getAttribute('aria-checked'), node.getAttribute('href')]),
    ).toEqual([
      ['For you', 'true', '/learn/issues?for-you=0'],
      ['Lessons I learned14, 14 issues once pressed', 'false', '/learn/issues?learned=1'],
    ]);
    expect($('[data-for-you-line]')?.textContent).toBe(
      '“For you” is on: your languages, at your level or one above. Change your languages or level',
    );
    expect(hrefs('[data-for-you-line] a')).toEqual(['/learn/setup']);
    expect(text()).toContain('Find duplicates in one pass with a set, which you learned.');
    expect(text()).toContain('A stack: last in, first out, which is new for you.');
    expect($$('[data-learn-only]')).toHaveLength(1);
    expect($('[data-learn-masked-line]')?.textContent).toContain('Five open issues at a time');
    expect($('[data-issues-chip]')).toBeNull();
    expect($('[data-issues-clear]')).toBeNull();
  });

  it('puts no count on a pressed switch: the count the API gives is the list with it turned off', async () => {
    const list = { ...personalList(), rows: [], forYouCount: 1001, learnedCount: 1001 };
    await render(<IssuesScreen view={views.learned} layer={{ kind: 'personal', list }} />);
    const switches = $$('[data-issues-switch]');
    expect(switches.map((node) => [node.textContent, node.getAttribute('aria-checked')])).toEqual([
      ['For you', 'true'],
      ['Lessons I learned', 'true'],
    ]);
  });

  it("shows no count while a new view is read: the counts on the screen are the last view's", async () => {
    await render(
      <IssuesScreen view={views.learned} layer={{ kind: 'personal', list: personalList(), pending: true }} />,
    );
    const switches = $$('[data-issues-switch]');
    expect(switches.map((node) => [node.textContent, node.getAttribute('aria-checked')])).toEqual([
      ['For you', 'true'],
      ['Lessons I learned', 'true'],
    ]);
  });

  it('presses a switch with Space as a click does, and leaves other keys alone', async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'personal', list: personalList() }} />);
    const learned = $('[data-issues-switch="learned"]') as HTMLAnchorElement;
    const clicks = vi.fn((event: Event) => event.preventDefault());
    learned.addEventListener('click', clicks);
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    await act(async () => learned.dispatchEvent(space));
    expect(space.defaultPrevented).toBe(true);
    expect(clicks).toHaveBeenCalledTimes(1);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => learned.dispatchEvent(tab));
    expect(tab.defaultPrevented).toBe(false);
    expect(clicks).toHaveBeenCalledTimes(1);
  });

  it('names an issue whose project the person named, over its facts', async () => {
    await render(
      <IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'personal', list: personalList({ rows: [namedRow] }) }} />,
    );
    expect(text()).toContain(namedRow.full?.repo);
  });

  it("draws a lesson's view at its own address: the way back, its chip, the switches staying there", async () => {
    await render(
      <IssuesScreen
        view={views.lesson}
        at="lesson"
        names={issuesNames}
        layer={{ kind: 'personal', list: personalList() }}
      />,
    );
    expect($('[data-issues-back]')?.getAttribute('href')).toBe('/learn/lessons/find-duplicates-with-a-set');
    expect($('[data-issues-back]')?.textContent).toBe('Find duplicates in one pass with a set');
    expect($('[data-issues-chip="lesson"]')?.textContent).toBe('Lesson: Find duplicates in one pass with a set');
    expect(hrefs('[data-issues-chip] a')).toEqual(['/learn/issues']);
    expect(hrefs('[data-issues-switch]')).toEqual([
      '/learn/lessons/find-duplicates-with-a-set/real-world?for-you=0',
      '/learn/lessons/find-duplicates-with-a-set/real-world?learned=1',
    ]);
    expect($('[data-issues-clear]')?.getAttribute('href')).toBe('/learn/issues');
    await render(
      <IssuesScreen
        view={views.lesson}
        at="lesson"
        names={issuesNames}
        layer={{ kind: 'personal', list: personalList() }}
      />,
    );
    expect(hrefs('[data-issues-foot] a')[0]).toBe('/learn/lessons/find-duplicates-with-a-set/real-world.md');
  });

  it('says issues wait outside "For you", with the switch to turn off and the email', async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'personal', list: listOutsideForYou() }} />);
    expect($('[data-issues-box="end"] h2')?.textContent).toBe('No open issue for you right now');
    expect(text()).toContain('26 open issues are outside your languages or level.');
    expect($('[data-issues-turn-off]')?.getAttribute('href')).toBe('/learn/issues?for-you=0');
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('off');
    expect($('[data-issues-email] button')?.textContent).toBe('Email me when one appears');
  });

  it("offers no email on a course's empty end", async () => {
    await render(
      <IssuesScreen
        view={views.course}
        at="course"
        names={issuesNames}
        layer={{ kind: 'personal', list: listNone() }}
      />,
    );
    expect($('[data-issues-box="end"] h2')?.textContent).toBe('No issue matches');
    expect($('[data-issues-email]')).toBeNull();
    expect($('[data-issues-turn-off]')).toBeNull();
  });

  it("says the email is on, with its address, in the button's place", async () => {
    const onTurnOff = vi.fn();
    await render(
      <IssuesScreen
        view={ISSUES_VIEW}
        layer={{ kind: 'personal', list: listNone({ emailOn: true }) }}
        email={{ onTurnOff }}
      />,
    );
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('on');
    expect(text()).toContain('We’ll email you at y***@example.com when one appears.');
    await act(async () => ($('[data-issues-email] button') as HTMLButtonElement).click());
    expect(onTurnOff).toHaveBeenCalledTimes(1);
  });

  it('says in place that the email needs an address, and where it is set, while on with none', async () => {
    await render(
      <IssuesScreen
        view={ISSUES_VIEW}
        layer={{ kind: 'personal', list: listNone({ emailOn: true, emailTo: null }) }}
      />,
    );
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('no-address');
    expect($('[data-email-needs-address]')?.textContent).toBe(
      'This email needs an address, and we have none for you. Add or verify one in your GitHub email settings, then sign in again.',
    );
    expect(hrefs('[data-email-needs-address] a')).toEqual(['https://github.com/settings/emails']);
    expect(text()).not.toContain('We’ll email you');
    expect($('[data-issues-email] button')?.textContent).toBe('Turn off');
  });

  it('turns the email on with one press, held while it saves, and says a failure', async () => {
    const onTurnOn = vi.fn();
    await render(<IssuesEmail state={{ kind: 'off' }} onTurnOn={onTurnOn} />);
    await act(async () => ($('button') as HTMLButtonElement).click());
    expect(onTurnOn).toHaveBeenCalledTimes(1);
    await render(<IssuesEmail state={{ kind: 'off' }} pending error="Not saved." onTurnOn={onTurnOn} />);
    expect($('button')?.getAttribute('aria-disabled')).toBe('true');
    await act(async () => ($('button') as HTMLButtonElement).click());
    expect(onTurnOn).toHaveBeenCalledTimes(1);
    expect($('[role="alert"]')?.textContent).toBe('Not saved.');
  });

  it("moves the focus to the button that takes the pressed one's place, and only after a press", async () => {
    const press = vi.fn();
    await render(<IssuesEmail state={{ kind: 'on', to: 'y***@example.com' }} onTurnOff={press} />);
    // Drawn on, with no press: the focus stays where it is.
    expect(document.activeElement).toBe(document.body);
    await render(<IssuesEmail state={{ kind: 'off' }} onTurnOn={press} />);
    expect(document.activeElement).toBe(document.body);

    await act(async () => ($('button') as HTMLButtonElement).click());
    await render(<IssuesEmail state={{ kind: 'no-address' }} onTurnOff={press} />);
    expect(document.activeElement?.textContent).toBe('Turn off');

    await act(async () => ($('button') as HTMLButtonElement).click());
    await render(<IssuesEmail state={{ kind: 'off' }} onTurnOn={press} />);
    expect(document.activeElement?.textContent).toBe('Email me when one appears');
    expect(press).toHaveBeenCalledTimes(2);
  });

  it('offers "Turn off “Lessons I learned”" when issues wait behind it', async () => {
    await render(
      <IssuesScreen view={views.learned} layer={{ kind: 'personal', list: listNone({ learnedCount: 40 }) }} />,
    );
    expect($('[data-issues-box="end"] h2')?.textContent).toBe('No open issue uses a lesson you learned right now');
    expect($('[data-issues-turn-off]')?.textContent).toBe('Turn off “Lessons I learned”');
    expect($('[data-issues-turn-off]')?.getAttribute('href')).toBe('/learn/issues');
  });

  it('draws the merged fixes for "Fixed", with no switch, and reads ten more in place', async () => {
    readMoreLearnFixes.mockResolvedValue({
      rows: [{ ...learnFixes.rows[1], repo: 'lumen-data/other', number: 7 }, learnFixes.rows[0]],
      total: 12,
      next: null,
    });
    await render(
      <IssuesScreen view={views.courseFixed} names={issuesNames} layer={{ kind: 'personal', list: personalList() }} />,
    );
    expect($$('[data-issues-switch]')).toHaveLength(0);
    await render(
      <IssuesScreen view={views.courseFixed} names={issuesNames} layer={{ kind: 'fixed', fixes: learnFixes }} />,
    );
    expect($$('[data-issues-switch]')).toHaveLength(0);
    expect($$('[data-issues-chip]').map((node) => node.getAttribute('data-issues-chip'))).toEqual(['course', 'fixed']);
    expect($$('[data-fix-row]').map((node) => node.getAttribute('data-fix-row'))).toEqual([
      'harbor-kit/relay#418',
      'lumen-data/importer#93',
    ]);
    const first = $('[data-fix-row]')?.textContent ?? '';
    expect($('[data-fix-row] [data-fix-title]')?.textContent).toBe('Webhook deliveries were processed twice');
    // The title opens the fix's own page, "Learn from it".
    expect($('[data-fix-row] [data-fix-title]')?.closest('a')?.getAttribute('href')).toBe(
      '/learn/fixes/harbor-kit/relay/418',
    );
    expect(first).toContain('fixed by octocat');
    expect(first).toContain('Used Find duplicates in one pass with a set.');
    expect(first).toContain('merged 18 Nov');
    expect($('[data-fixes-count]')?.textContent).toContain('Showing 2 of 12 fixes');
    // The copy of a view of fixes is that of its open issues.
    expect(hrefs('[data-issues-foot] a')[0]).toBe('/learn/issues.md?course=algorithms');
    await act(async () => ($('[data-fixes-count] button') as HTMLButtonElement).click());
    expect(readMoreLearnFixes).toHaveBeenCalledWith(
      { lesson: null, course: 'algorithms', language: null, repo: null, org: null },
      'cursor-2',
    );
    // A fix already shown is not drawn twice; the last page has no "Show more".
    expect($$('[data-fix-row]')).toHaveLength(3);
    expect($('[data-fixes-count] button')).toBeNull();
  });

  it("reads ten more of a project's fixes for the same project", async () => {
    readMoreLearnFixes.mockResolvedValue({ rows: [], total: 2, next: null });
    const view = { ...views.repo, fixed: true };
    await render(<IssuesScreen view={view} layer={{ kind: 'fixed', fixes: learnFixes }} />);
    expect($$('[data-issues-chip]').map((node) => node.getAttribute('data-issues-chip'))).toEqual(['repo', 'fixed']);
    await act(async () => ($('[data-fixes-count] button') as HTMLButtonElement).click());
    expect(readMoreLearnFixes).toHaveBeenCalledWith(
      { lesson: null, course: null, language: null, repo: 'django/django', org: null },
      'cursor-2',
    );
  });

  it('says when no fix was merged yet', async () => {
    await render(
      <IssuesScreen view={views.courseFixed} layer={{ kind: 'fixed', fixes: { rows: [], total: 0, next: null } }} />,
    );
    expect($('[data-issues-box="fixes-end"] h2')?.textContent).toBe('No fix merged yet');
  });

  it("says a visitor's empty view plainly", async () => {
    await render(<IssuesScreen view={views.language} layer={{ kind: 'visitor', rows: [] }} />);
    expect($('[data-issues-box="visitor-end"]')?.textContent).toContain('There is no open issue in Go right now.');
    expect($('[data-issues-chip="language"]')?.textContent).toBe('Language: Go');
  });

  it('says the list is not here yet when the API does not answer it, with the way to the courses', async () => {
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'unavailable' }} />);
    expect($('[data-issues-box="unavailable"] h2')?.textContent).toBe('Real issues are not here yet');
    expect(hrefs('[data-issues-box="unavailable"] a')).toEqual(['/learn/courses']);
    expect($('[data-masked-row]')).toBeNull();
  });

  it('says a failed read, with "Try again" when it can', async () => {
    const onRetry = vi.fn();
    await render(<IssuesScreen view={ISSUES_VIEW} layer={{ kind: 'failed' }} onRetry={onRetry} />);
    expect(text()).toContain('The issues didn’t load. Try again in a minute.');
    await act(async () => ($('[data-issues-box="failed"] button') as HTMLButtonElement).click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('writes no long dash in any state', async () => {
    for (const layer of [
      { kind: 'visitor', rows: visitorRows },
      { kind: 'personal', list: personalList() },
      { kind: 'personal', list: listOutsideForYou({ emailOn: true, emailTo: null }) },
      { kind: 'fixed', fixes: learnFixes },
      { kind: 'unavailable' },
      { kind: 'failed' },
    ] as const) {
      await render(<IssuesScreen view={views.course} at="course" names={issuesNames} layer={layer} />);
      expect(text(), layer.kind).not.toContain('—');
    }
    expect(issueRows).toHaveLength(5);
  });
});
