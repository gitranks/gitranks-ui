// @vitest-environment jsdom
import type { Route } from 'next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, push, signIn, saveLearnSetupAction, startLearnSetupGuessAction } = vi.hoisted(() => ({
  hint: { present: true },
  push: vi.fn(),
  signIn: vi.fn(async () => undefined),
  saveLearnSetupAction: vi.fn(),
  startLearnSetupGuessAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('@/lib/learn/setup.actions', () => ({ saveLearnSetupAction, startLearnSetupGuessAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { SetupLive, SETUP_POLLS } = await import('./setup-live');
type SetupMode = import('./setup-live').SetupMode;
const { setupGuessed, setupNone, setupNothing, setupSaved, setupWorking } = await import(
  '@/lib/learn/__fixtures__/setup'
);
const { EXAMPLE_LANGUAGE_KEY } = await import('@/lib/learn/use-example-language');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
/** The route's answers, one for each read in turn; the last one stays. */
const answers = (...replies: { setup?: unknown; signedOut?: boolean; status?: number }[]) => {
  const queue = [...replies];
  fetchMock.mockImplementation(async () => {
    const { setup = null, signedOut = false, status = 200 } = (queue.length > 1 ? queue.shift() : queue[0]) ?? {};
    return new Response(JSON.stringify({ setup, signedOut }), { status });
  });
};

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  for (const mock of [push, signIn, saveLearnSetupAction, startLearnSetupGuessAction]) mock.mockReset();
  signIn.mockResolvedValue(undefined);
  startLearnSetupGuessAction.mockResolvedValue({ ok: true, data: 'WORKING' });
  hint.present = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const draw = ({ mode = 'editor' as SetupMode, back = null as string | null } = {}) =>
  act(async () => {
    root.render(<SetupLive mode={mode} back={back as Route | null} />);
  });
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const state = () => $('[data-learn-setup]')?.dataset.learnSetup ?? null;
const intro = () => $('[data-setup-intro]')?.textContent ?? '';
const title = () => $('h1')?.textContent ?? '';
const input = (name: string, value: string | number) =>
  $(`input[name="${name}"][value="${value}"]`) as HTMLInputElement;
const checked = (name: string) =>
  [...host.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)]
    .filter((box) => box.checked)
    .map((box) => box.value);
const pills = () => [...host.querySelectorAll('[data-setup-pill]')].map((pill) => pill.textContent);
const saveButton = () => $('[data-setup-save]') as HTMLButtonElement;
const notice = () => $('[data-setup-notice]')?.textContent ?? null;
const buttonOf = (text: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text);
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
const enter = () =>
  act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });

describe('the editor at /learn/setup, for a person with the Learn sign', () => {
  it('asks a visitor to sign in and reads nothing, the title taking the focus', async () => {
    hint.present = false;
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state()).toBe('visitor');
    expect(title()).toBe('Setting up Learn needs an account');
    expect(document.activeElement).toBe($('h1'));
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/setup' });
  });

  it('draws the same page while the setup is on its way: nothing chosen, nothing to press', async () => {
    let answer: (res: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (answer = resolve)));
    await draw();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/setup', { cache: 'no-store' });
    expect(state()).toBe('pending');
    expect(intro()).toBe('Loading your setup…');
    expect(saveButton().disabled).toBe(true);
    expect(input('mainLanguage', 'go').disabled).toBe(true);
    expect($('form')?.getAttribute('aria-busy')).toBe('true');
    // Enter does nothing yet.
    await enter();
    expect(saveLearnSetupAction).not.toHaveBeenCalled();
    await act(async () => answer(Response.json({ setup: setupGuessed, signedOut: false })));
    expect(state()).toBe('guess');
    expect(saveButton().disabled).toBe(false);
  });

  it('says so when the setup does not come, and reads again on Try again', async () => {
    answers({ status: 500 }, { setup: setupGuessed });
    await draw();
    expect(state()).toBe('failed');
    expect(title()).toBe('Your setup did not load');
    expect(document.activeElement).toBe($('h1'));
    await click(buttonOf('Try again')!);
    expect(state()).toBe('guess');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The button is gone: the form's title holds the focus, never the page's body.
    expect(title()).toBe('Set up Learn');
    expect(document.activeElement).toBe($('h1'));
  });

  it('keeps the focus on the form’s title after Try again while the setup is still on its way', async () => {
    answers({ status: 500 });
    await draw();
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    await click(buttonOf('Try again')!);
    expect(state()).toBe('pending');
    expect(document.activeElement).toBe($('h1'));
    expect(document.activeElement).not.toBe(document.body);
  });

  it('never moves the focus to the title on a first read', async () => {
    answers({ setup: setupGuessed });
    await draw();
    expect(document.activeElement).toBe(document.body);
  });

  it('asks to sign in again when the session ended', async () => {
    answers({ signedOut: true });
    await draw();
    expect(state()).toBe('ended');
    expect(title()).toBe('Sign in again to go on');
  });

  it('shows our guess, and saves it in place, sending no sign', async () => {
    answers({ setup: setupGuessed });
    saveLearnSetupAction.mockResolvedValue({ ok: true, data: { ...setupGuessed, state: 'SAVED', guessed: [] } });
    await draw();
    expect(checked('mainLanguage')).toEqual(['go']);
    expect(checked('otherLanguages')).toEqual(['python']);
    expect(checked('level')).toEqual(['3']);
    expect(pills()).toEqual(['Our guess', 'Our guess', 'Our guess']);
    // The main language is not offered among the others.
    expect(input('otherLanguages', 'go')).toBeNull();
    expect(saveButton().textContent).toBe('Save');
    // It points to Learn's group in Settings, opened with Learn's bar.
    expect(host.textContent).toContain('You can change this later in Settings, under Learn preferences.');
    expect(host.querySelector('[data-setup-later] a')?.getAttribute('href')).toBe(
      '/my/settings?from=learn#learn-preferences',
    );
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
    await click(saveButton());
    expect(saveLearnSetupAction).toHaveBeenCalledWith(
      { mainLanguage: 'go', otherLanguages: ['python'], level: 3 },
      { onboarding: false },
    );
    expect(push).not.toHaveBeenCalled();
    expect(notice()).toBe('Saved.');
    expect(state()).toBe('saved');
  });

  it('goes to the way back after the save, when the sign could not be read and a page sent the person here', async () => {
    answers({ setup: setupSaved });
    saveLearnSetupAction.mockResolvedValue({ ok: true, data: setupSaved });
    await draw({ back: '/learn/lessons/hash-maps' });
    await click(saveButton());
    expect(saveLearnSetupAction).toHaveBeenCalledWith(expect.anything(), { onboarding: false });
    expect(push).toHaveBeenCalledWith('/learn/lessons/hash-maps');
    // Busy until the next page is up.
    expect(saveButton().disabled).toBe(true);
  });

  it('starts our guess on a first visit, keeps what the person chose meanwhile, and fills only the rest', async () => {
    vi.useFakeTimers();
    answers({ setup: setupNone }, { setup: setupWorking }, { setup: setupGuessed });
    await draw();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
    expect(state()).toBe('waiting');
    expect(intro()).toMatch(/^We are reading your public GitHub profile/);
    expect(pills()).toEqual([]);

    await click(input('mainLanguage', 'rust'));
    await click(input('level', 2));
    expect(pills()).toEqual(['You picked it', 'You picked it']);

    await act(async () => vi.advanceTimersByTime(2000));
    expect(state()).toBe('waiting');
    await act(async () => vi.advanceTimersByTime(2000));
    expect(state()).toBe('arrived');
    expect(checked('mainLanguage')).toEqual(['rust']);
    expect(checked('otherLanguages')).toEqual(['python']);
    expect(checked('level')).toEqual(['2']);
    expect(pills()).toEqual(['You picked it', 'Our guess', 'You picked it']);
    expect(intro()).toMatch(/^Our guess is in\./);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
  });

  it('lets the person fill the fields when our guess cannot start', async () => {
    answers({ setup: setupNone });
    startLearnSetupGuessAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    await draw();
    expect(state()).toBe('unread');
    expect(intro()).toBe('We could not read your public GitHub profile just now. Choose what fits you, then save.');
  });

  it('stops waiting for our guess after so many reads, and when it is dropped', async () => {
    vi.useFakeTimers();
    answers({ setup: setupWorking });
    await draw();
    for (let tick = 0; tick <= SETUP_POLLS; tick += 1) await act(async () => vi.advanceTimersByTime(2000));
    expect(fetchMock).toHaveBeenCalledTimes(SETUP_POLLS + 1);
    expect(state()).toBe('unread');

    act(() => root.unmount());
    root = createRoot(host);
    fetchMock.mockReset();
    answers({ setup: setupWorking }, { setup: setupNone });
    await draw();
    await act(async () => vi.advanceTimersByTime(2000));
    expect(state()).toBe('unread');
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
  });

  it('opens with Python for now when we found nothing, or the language switched on an example', async () => {
    answers({ setup: setupNothing });
    await draw();
    expect(checked('mainLanguage')).toEqual(['python']);
    expect(pills()).toEqual(['For now', 'Our guess']);

    act(() => root.unmount());
    root = createRoot(host);
    window.localStorage.setItem(EXAMPLE_LANGUAGE_KEY, 'rust');
    await draw();
    expect(checked('mainLanguage')).toEqual(['rust']);
    expect(pills()).toEqual(['You picked it', 'Our guess']);
    expect(intro()).toMatch(/You switched an example to Rust/);
  });

  it('says what a save still needs, focuses it, and sends nothing', async () => {
    answers({ setup: setupWorking });
    await draw();
    await click(saveButton());
    expect(saveLearnSetupAction).not.toHaveBeenCalled();
    expect(notice()).toBe('Choose your main language and how much you have programmed, then save.');
    expect(document.activeElement).toBe(input('mainLanguage', 'python'));
    await click(input('mainLanguage', 'go'));
    expect(notice()).toBeNull();
    await enter();
    expect(notice()).toBe('Choose how much you have programmed, then save.');
    expect(document.activeElement).toBe(input('level', 1));
  });

  it('keeps the choices when a save fails, and asks to sign in when the session ended', async () => {
    answers({ setup: setupGuessed });
    saveLearnSetupAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await draw();
    await click(saveButton());
    expect(notice()).toBe('We could not save just now. Your choices are still here: try again in a minute.');
    expect(checked('mainLanguage')).toEqual(['go']);
    expect(saveButton().disabled).toBe(false);
    expect(push).not.toHaveBeenCalled();

    saveLearnSetupAction.mockResolvedValueOnce({ ok: false, error: 'SIGNED_OUT' });
    await click(saveButton());
    expect(notice()).toBe('Your session ended. Sign in again, then save.');
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/setup' });

    // No setup back (Learn not open to them) is a failure too, never a move on.
    saveLearnSetupAction.mockResolvedValueOnce({ ok: true, data: null });
    await click(saveButton());
    expect(notice()).toBe('We could not save just now. Your choices are still here: try again in a minute.');
    expect(push).not.toHaveBeenCalled();
  });

  it('changes a setup saved before in place, and says it is saved', async () => {
    answers({ setup: setupSaved });
    await draw();
    expect(pills()).toEqual([]);
    expect(saveButton().textContent).toBe('Save');
    expect(host.textContent).not.toContain('You can change this later');
    await click(input('otherLanguages', 'ruby'));
    saveLearnSetupAction.mockResolvedValue({
      ok: true,
      data: { ...setupSaved, otherLanguages: ['python', 'go', 'ruby'] },
    });
    await enter();
    expect(saveLearnSetupAction).toHaveBeenCalledWith(
      { mainLanguage: 'rust', otherLanguages: ['python', 'go', 'ruby'], level: 2 },
      { onboarding: false },
    );
    expect(push).not.toHaveBeenCalled();
    expect(notice()).toBe('Saved.');
    expect(checked('otherLanguages')).toEqual(['python', 'go', 'ruby']);
    expect(state()).toBe('saved');
  });

  it('names each group by its title, its note and its line, for a screen reader', async () => {
    answers({ setup: setupGuessed });
    await draw();
    const group = $('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-labelledby')).toBe('learn-setup-mainLanguage');
    expect(group.getAttribute('aria-describedby')).toBe('learn-setup-mainLanguage-pill learn-setup-mainLanguage-hint');
    expect($('[data-setup-intro]')?.getAttribute('aria-live')).toBe('polite');
    expect($('#learn-setup-notice')?.getAttribute('role')).toBe('status');
  });
});

describe("Learn's onboarding at /learn/setup, for a person without the Learn sign", () => {
  const onboard = (back: string | null = null) => draw({ mode: 'onboarding', back });
  const steps = () => [...host.querySelectorAll('[data-flow-steps] li')].map((step) => step.textContent);
  const line = () => $('[data-onboarding-line]')?.textContent ?? null;
  const saveAndStart = () => $('[data-onboarding-save]') as HTMLButtonElement;
  const ticked = () => checked('languages');
  const keptFor = (slug: string) =>
    window.localStorage.setItem(
      'gr_learn_kept_answer',
      JSON.stringify({ slug, question: 'q1', picked: 1, tries: 1, language: null, at: Date.now() }),
    );

  it('shows how Learn works first, under its own two steps, then the languages on Continue or Enter', async () => {
    answers({ setup: setupGuessed });
    await onboard();
    expect(steps()).toEqual(['How Learn works', 'Your languages']);
    expect(title()).toBe('How Learn works');
    expect(host.querySelectorAll('[data-onboarding-step="how"] ~ ol li')).toHaveLength(3);
    expect(host.textContent).toContain('Short lessons, one idea each.');
    expect(line()).toBeNull();
    await click(buttonOf('Continue')!);
    expect(title()).toBe('Your languages');
    expect(document.activeElement).toBe($('h1'));
    expect(host.textContent).toContain(
      'Pick the languages you want to learn. We start you at the first lesson of each.',
    );
    act(() => root.unmount());
    root = createRoot(host);
    await onboard();
    await enter();
    expect(title()).toBe('Your languages');
  });

  it('says where the person goes after: back to the lesson, with their answer kept, or to the issue', async () => {
    answers({ setup: setupGuessed });
    await onboard('/learn/lessons/hash-maps');
    expect(line()).toBe('After this you go back to the lesson.');
    act(() => root.unmount());
    root = createRoot(host);
    keptFor('hash-maps');
    await onboard('/learn/lessons/hash-maps');
    expect(line()).toBe('Your answer is kept. After this you go back to the lesson.');
    act(() => root.unmount());
    root = createRoot(host);
    keptFor('another-lesson');
    await onboard('/learn/lessons/hash-maps');
    expect(line()).toBe('After this you go back to the lesson.');
    act(() => root.unmount());
    root = createRoot(host);
    await onboard('/my/issues/q7k2m9xa?from=learn&look=1');
    expect(line()).toBe('After this you go back to the issue.');
    // The line is the first step's only.
    await click(buttonOf('Continue')!);
    expect(line()).toBeNull();
  });

  it('ticks our guess, and "Save and start" saves it with the sign, then goes back, else to Learn home', async () => {
    answers({ setup: setupGuessed });
    saveLearnSetupAction.mockResolvedValue({ ok: true, data: { ...setupGuessed, state: 'SAVED', guessed: [] } });
    await onboard('/learn/lessons/hash-maps');
    await click(buttonOf('Continue')!);
    expect(ticked()).toEqual(['python', 'go']);
    expect(host.querySelector('[data-setup-later] a')?.getAttribute('href')).toBe(
      '/my/settings?from=learn#learn-preferences',
    );
    await click(saveAndStart());
    expect(saveLearnSetupAction).toHaveBeenCalledWith(
      { mainLanguage: 'go', otherLanguages: ['python'], level: 3 },
      { onboarding: true },
    );
    expect(push).toHaveBeenCalledWith('/learn/lessons/hash-maps');
    expect(saveAndStart().disabled).toBe(true);

    act(() => root.unmount());
    root = createRoot(host);
    push.mockReset();
    await onboard();
    await enter();
    await enter();
    expect(push).toHaveBeenCalledWith('/learn');
  });

  it('keeps the main language while it is ticked, else takes the first ticked in Learn’s order', async () => {
    answers({ setup: setupGuessed });
    saveLearnSetupAction.mockResolvedValue({ ok: true, data: setupSaved });
    await onboard();
    await click(buttonOf('Continue')!);
    await click(input('languages', 'ruby'));
    await click(input('languages', 'go'));
    expect(ticked()).toEqual(['python', 'ruby']);
    await click(saveAndStart());
    expect(saveLearnSetupAction).toHaveBeenCalledWith(
      { mainLanguage: 'python', otherLanguages: ['ruby'], level: 3 },
      { onboarding: true },
    );
  });

  it('sends some experience when no level is saved or guessed', async () => {
    answers({ setup: setupNone });
    startLearnSetupGuessAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    saveLearnSetupAction.mockResolvedValue({ ok: true, data: setupSaved });
    await onboard();
    await click(buttonOf('Continue')!);
    expect(ticked()).toEqual([]);
    await click(input('languages', 'rust'));
    await click(saveAndStart());
    expect(saveLearnSetupAction).toHaveBeenCalledWith(
      { mainLanguage: 'rust', otherLanguages: [], level: 2 },
      { onboarding: true },
    );
  });

  it('keeps "Save and start" off with nothing ticked, and while the setup is on its way', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));
    await onboard();
    await click(buttonOf('Continue')!);
    expect(saveAndStart().disabled).toBe(true);
    act(() => root.unmount());
    root = createRoot(host);
    answers({ setup: setupGuessed });
    await onboard();
    await click(buttonOf('Continue')!);
    await click(input('languages', 'go'));
    await click(input('languages', 'python'));
    expect(ticked()).toEqual([]);
    expect(saveAndStart().disabled).toBe(true);
    await enter();
    await click(saveAndStart());
    expect(saveLearnSetupAction).not.toHaveBeenCalled();
  });

  it('goes on with nothing ticked when the setup cannot be read, and keeps the ticks when a save fails', async () => {
    answers({ status: 500 });
    saveLearnSetupAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    await onboard();
    expect(title()).toBe('How Learn works');
    await click(buttonOf('Continue')!);
    await click(input('languages', 'java'));
    await click(saveAndStart());
    expect(notice()).toBe('We could not save just now. Your choices are still here: try again in a minute.');
    expect(ticked()).toEqual(['java']);
    expect(push).not.toHaveBeenCalled();
  });

  it('asks a visitor to sign in first, back to the same address', async () => {
    hint.present = false;
    await onboard('/learn/lessons/hash-maps');
    expect(state()).toBe('visitor');
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', {
      redirectTo: `/learn/setup?back=${encodeURIComponent('/learn/lessons/hash-maps')}`,
    });
  });
});
