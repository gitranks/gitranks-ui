// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }) }));
const contribute = vi.hoisted(() => ({ savePreferences: vi.fn() }));
vi.mock('@/lib/contribute/actions', () => contribute);
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));

const { WorkStep } = await import('./work-step');
const { IDENTITY_PROVIDER } = await import('@/lib/auth-providers');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  window.history.replaceState(null, '', '/contribute/start');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const tick = (value: string) =>
  act(async () => container.querySelector<HTMLInputElement>(`input[data-pick="${value}"]`)?.click());
const press = (label: string) =>
  act(async () =>
    [...container.querySelectorAll('button')].find((each) => each.textContent?.trim() === label)?.click(),
  );
const ticked = () =>
  [...container.querySelectorAll<HTMLInputElement>('input[data-pick]')]
    .filter((input) => input.checked)
    .map((input) => input.dataset.pick);

const NONE = { languages: [], kinds: [] };

describe('What you work on', () => {
  it('offers the pool’s seven languages and the six kinds, none picked meaning every one', async () => {
    await render(<WorkStep initial={NONE} signedIn={false} />);
    const labels = [...container.querySelectorAll('label')].map((label) => label.textContent?.trim());
    expect(labels).toEqual([
      'JavaScript / TypeScript',
      'Python',
      'Go',
      'Rust',
      'Java',
      'PHP',
      'Ruby',
      'Bugs',
      'Small features',
      'Docs',
      'Tests',
      'Refactoring',
      'Performance',
    ]);
    expect(container.textContent).toContain('None picked: every language the pool has.');
    expect(container.textContent).toContain('None picked: every kind.');
    await tick('GO');
    await tick('RUST');
    expect(container.textContent).toContain('Pick the ones you write. 2 picked.');
  });

  it('a visitor’s Continue carries the picks to step 2 in the address, saving nothing', async () => {
    await render(<WorkStep initial={{ languages: ['RUST'], kinds: [] }} signedIn={false} />);
    expect(ticked()).toEqual(['RUST']);
    await tick('GO');
    await tick('BUG');
    await press('Continue');
    expect(push).toHaveBeenCalledWith('/contribute/start/agent?languages=rust,go&kinds=bug');
    expect(contribute.savePreferences).not.toHaveBeenCalled();
  });

  it('a visitor may sign in to fill it from their repositories, back to this step with the picks so far', async () => {
    await render(<WorkStep initial={NONE} signedIn={false} />);
    const link = container.querySelector<HTMLButtonElement>('[data-sign-in="work"]');
    expect(link?.textContent).toBe('Sign in with GitHub to fill this in from your repositories');
    expect(link?.dataset.contributeSource).toBe('contribute_flow_sign_in');
    await tick('PYTHON');
    await tick('DOCS');
    await act(async () => link?.click());
    expect(signIn).toHaveBeenCalledWith(IDENTITY_PROVIDER, {
      redirectTo: '/contribute/start?languages=python&kinds=docs',
    });
  });

  it('signed in, Continue saves the picks, then goes on to step 2 with none in the address', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: true, data: {} });
    await render(<WorkStep initial={{ languages: ['JS_TS', 'GO'], kinds: ['TESTS'] }} signedIn />);
    expect(container.querySelector('[data-sign-in]')).toBeNull();
    expect(ticked()).toEqual(['JS_TS', 'GO', 'TESTS']);
    await press('Continue');
    expect(contribute.savePreferences).toHaveBeenCalledWith({ languages: ['JS_TS', 'GO'], kinds: ['TESTS'] });
    expect(push).toHaveBeenCalledWith('/contribute/start/agent');
  });

  it('a failed save keeps the picks and says so in one line', async () => {
    contribute.savePreferences.mockResolvedValue({ ok: false, error: 'NOT_AVAILABLE_YET' });
    await render(<WorkStep initial={{ languages: ['RUBY'], kinds: [] }} signedIn />);
    await press('Continue');
    expect(push).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Couldn't save. Try again.");
    expect(ticked()).toEqual(['RUBY']);
  });

  it('marks Continue as the step’s click', async () => {
    await render(<WorkStep initial={NONE} signedIn={false} />);
    const button = [...container.querySelectorAll('button')].find((each) => each.textContent === 'Continue');
    expect(button?.dataset.contributeSource).toBe('contribute_flow_work');
  });
});
