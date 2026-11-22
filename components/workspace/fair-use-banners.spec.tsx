// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ dismissFairUseNotice: vi.fn(), dismissRulesBanner: vi.fn() }));
vi.mock('@/lib/workspace/fair-use.actions', () => actions);

const { FairUseBanners } = await import('./fair-use-banners');
const { ContributeNotices } = await import('./contribute-notices');
const { accessNoticesOf } = await import('@/lib/workspace/contribute-state');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { blockNotice, fairUse, fairUseBlocked, fairUseNotice, noFairUse, rulesBanner, viewingNotice } = await import(
  '@/lib/contribute/__fixtures__/fair-use'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const render = (node: ReactNode) => act(async () => root.render(node));
const banners = () =>
  [...container.querySelectorAll('[data-fair-use]')].map((each) => each.getAttribute('data-fair-use'));
const closeOf = (name: string) =>
  container.querySelector<HTMLButtonElement>(`[data-fair-use="${name}"] button[aria-label="Close"]`);

describe('the fair-use banners', () => {
  it('draw nothing while the API sends nothing', async () => {
    await render(<FairUseBanners fairUse={null} />);
    expect(container.innerHTML).toBe('');
    await render(<FairUseBanners fairUse={noFairUse} />);
    expect(container.innerHTML).toBe('');
  });

  it('close a message at once and tell the API, which keeps it closed on every device', async () => {
    actions.dismissFairUseNotice.mockResolvedValue({ ok: true, data: true });
    await render(<FairUseBanners fairUse={fairUse({ notices: [viewingNotice, fairUseNotice()] })} />);
    expect(banners()).toEqual(['notice', 'notice']);
    await act(async () => closeOf('notice')?.click());
    expect(actions.dismissFairUseNotice).toHaveBeenCalledWith('583231-viewing-1-1');
    expect(banners()).toEqual(['notice']);
    expect(container.textContent).toContain('acme/widgets#412');
  });

  it('close the Terms banner for good, and show it again when the close did not reach the API', async () => {
    actions.dismissRulesBanner.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await render(<FairUseBanners fairUse={fairUse({ rulesBanner })} />);
    await act(async () => closeOf('rules')?.click());
    expect(actions.dismissRulesBanner).toHaveBeenCalledTimes(1);
    expect(banners()).toEqual(['rules']);

    actions.dismissRulesBanner.mockResolvedValueOnce({ ok: true, data: true });
    await act(async () => closeOf('rules')?.click());
    expect(banners()).toEqual([]);
  });

  it('never close the block’s message, and never draw it twice', async () => {
    await render(<FairUseBanners fairUse={fairUse({ notices: [blockNotice], block: blockNotice })} />);
    expect(banners()).toEqual(['block']);
    expect(closeOf('block')).toBeNull();
    // "answer here" in the message, then the Answer button: both open its answer page.
    expect(
      [...container.querySelectorAll('a[href="/contribute/answer/583231-outsidePr-3-1"]')].map((a) => a.textContent),
    ).toEqual(['answer here', 'Answer']);
  });
});

describe('the access level’s notice for an account a fair-use rule blocked', () => {
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, ' ')
      .replaceAll('&#x27;', "'")
      .replace(/\s+/g, ' ')
      .replace(/ ([.,])/g, '$1')
      .trim();

  it('stays paused, with the block’s message, its answer page and the rule in place of the automated-activity words', () => {
    const notices = accessNoticesOf(fairUseBlocked);
    expect(notices).toEqual([{ kind: 'suspended', fairUse: { block: blockNotice } }]);
    const html = renderToStaticMarkup(<ContributeNotices notices={notices} />);
    expect(plain(html)).toContain(
      `Contribute is paused for this account ${blockNotice.text} Answer → Terms of service`,
    );
    expect(html).toContain('href="/contribute/answer/583231-outsidePr-3-1"');
    expect(html).toContain('href="/terms#contribute-rules"');
    expect(html).not.toContain('looks automated');
    expect(html).not.toContain('mailto:');
  });

  it('says the account is paused on a pull request’s line too, the message and both links under "Why?"', () => {
    const html = renderToStaticMarkup(<ContributeNotices notices={accessNoticesOf(fairUseBlocked)} variant="line" />);
    expect(plain(html)).toContain(
      `Contribute is paused for this account Why? ${blockNotice.text} Answer → Terms of service`,
    );
  });

  it('points to the rule when the block’s message could not be read', () => {
    const view = { ...fairUseBlocked, fairUseBlock: null };
    const html = renderToStaticMarkup(<ContributeNotices notices={accessNoticesOf(view)} />);
    expect(plain(html)).toContain('Contribute is paused for this account Read the rule in our Terms of service.');
    expect(html).toContain('href="/terms#contribute-rules"');
    expect(html).not.toContain('looks automated');
  });

  it('keeps the automated-activity words for any other hold', () => {
    const html = renderToStaticMarkup(<ContributeNotices notices={accessNoticesOf(views.suspended)} />);
    expect(html).toContain('looks automated');
  });
});
