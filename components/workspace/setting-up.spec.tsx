// @vitest-environment jsdom
import { act, type ReactElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh, retry, loadContributeSetupState } = vi.hoisted(() => ({
  refresh: vi.fn(),
  retry: vi.fn(),
  loadContributeSetupState: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/lib/workspace/setup.actions', () => ({ retryContributeSetup: retry }));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContributeSetupState }));

const { ContributeNoProfile, ContributeNoProfileOf, ContributeSettingUp, ContributeSetupFailed } = await import(
  './setting-up'
);
const { ContributeNoProfileRead } = await import('./no-profile-panel');
const { SETUP_RETRY_LATER, SetupRetry } = await import('./setup-retry');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Words a person must never read on these panels: an hour's wait, a claim, the long dash. */
const NEVER = /hour|claim|—/i;

describe('the panels of an account with no profile', () => {
  it('says the account is being set up, with Refresh, and never an hour', () => {
    const plain = text(renderToStaticMarkup(<ContributeSettingUp />));
    expect(plain).toContain('Setting up your GitRanks account');
    expect(plain).toContain('This takes about a minute, and this page updates by itself.');
    expect(plain).not.toMatch(NEVER);
  });

  it('says a failed read so, with Try again, on either side', () => {
    for (const product of ['Contribute', 'Learn'] as const) {
      const html = renderToStaticMarkup(<ContributeSetupFailed product={product} />);
      const plain = text(html);
      expect(plain).toContain(`GitRanks ${product}`);
      expect(plain).toContain('We could not set up your GitRanks account');
      expect(plain).toContain('GitRanks could not read your GitHub profile. Try again: it takes about a minute.');
      expect(html).toContain('data-setup-retry');
      expect(plain).not.toMatch(NEVER);
    }
  });

  it('says GitRanks does not read an account it does not, with nothing to try and no hour', () => {
    const html = renderToStaticMarkup(<ContributeNoProfile product="Learn" />);
    const plain = text(html);
    expect(plain).toContain('Not open to your GitHub account');
    expect(plain).toContain('GitRanks does not read your GitHub account, so Learn is not open to it.');
    expect(plain).not.toMatch(/try again/i);
    expect(plain).not.toMatch(NEVER);
    expect(html).not.toContain('data-setup-retry');
  });

  it.each([
    ['setting-up', 'data-contribute-setting-up'],
    ['failed', 'data-contribute-setup-failed'],
    ['removed', 'data-contribute-no-profile'],
    ['none', 'data-contribute-no-profile'],
  ] as const)('draws %s as its panel, read or given', async (state, mark) => {
    expect(renderToStaticMarkup(<ContributeNoProfileOf state={state} />)).toContain(mark);
    loadContributeSetupState.mockResolvedValueOnce(state);
    const html = renderToStaticMarkup((await ContributeNoProfileRead({ product: 'Learn' })) as ReactElement);
    expect(html).toContain(mark);
    expect(html).toContain('GitRanks Learn');
  });
});

describe('Try again', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    refresh.mockReset();
    retry.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (node: ReactNode) => act(async () => root.render(node));
  const press = () => act(async () => container.querySelector<HTMLButtonElement>('[data-setup-retry]')?.click());
  const note = () => container.querySelector('[role="status"]')?.textContent ?? null;

  it.each(['setting-up', 'none', 'removed'] as const)(
    'reads the page again once the API answers %s, with no line',
    async (state) => {
      retry.mockResolvedValueOnce({ ok: true, data: state });
      await render(<SetupRetry />);
      await press();
      expect(retry).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(note()).toBeNull();
    },
  );

  it('says to try again in a few minutes when the read did not start, or the call failed, and reads nothing', async () => {
    await render(<SetupRetry />);
    retry.mockResolvedValueOnce({ ok: true, data: 'failed' });
    await press();
    expect(note()).toBe(SETUP_RETRY_LATER);
    retry.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await press();
    expect(note()).toBe('It did not start this time. Try again in a few minutes.');
    expect(refresh).not.toHaveBeenCalled();
    // A try that works clears the line.
    retry.mockResolvedValueOnce({ ok: true, data: 'setting-up' });
    await press();
    expect(note()).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
