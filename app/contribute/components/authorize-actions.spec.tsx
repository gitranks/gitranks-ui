// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { approve, approveAsReviewer } = vi.hoisted(() => ({ approve: vi.fn(), approveAsReviewer: vi.fn() }));

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/actions', () => ({ approveContributeOAuth: approve }));
vi.mock('@/lib/workspace/review-sign-in.actions', () => ({ approveContributeOAuthAsReviewer: approveAsReviewer }));
vi.mock('@/lib/workspace/setup.actions', () => ({ retryContributeSetup: vi.fn() }));

const { AuthorizeActions, AuthorizeReviewSignIn } = await import('./authorize-actions');
const { AuthorizeScreen } = await import('./authorize-view');
const { AGENT_FIRST_PROMPT } = await import('@/lib/workspace/mcp-setup');
const { CONTACT_EMAIL } = await import('@/lib/legal');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ID = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_abcde';
/** An app's own scheme: the browser hands it to the app and this page stays open. */
const APP_REDIRECT = 'cursor://anysphere.cursor-mcp/oauth/callback?code=c0de';

let container: HTMLDivElement;
let root: Root;
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  assign = vi.fn();
  // jsdom's location can't be spied on: a stand-in with the one method the page calls.
  vi.stubGlobal('location', { ...window.location, assign });
  approve.mockReset();
  approveAsReviewer.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const click = async (selector: string) => {
  const button = container.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`No ${selector}`);
  await act(async () => button.click());
};

describe('the step after Allow', () => {
  it('goes back to the app, then says it is connected, what to ask it, where pull requests wait, and the docs', async () => {
    approve.mockResolvedValue({ ok: true, data: { redirectTo: APP_REDIRECT } });
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Cursor" />));
    expect(container.querySelector('[data-authorize-next]')).toBeNull();

    await click('[data-authorize="allow"]');

    expect(approve).toHaveBeenCalledWith(ID);
    expect(assign).toHaveBeenCalledWith(APP_REDIRECT);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Allowed. Go back to Cursor: it is connected.',
    );
    const next = container.querySelector('[data-authorize-next]');
    expect(next?.textContent).toContain('Prompt for Cursor');
    expect(next?.querySelector('pre')?.textContent).toBe(AGENT_FIRST_PROMPT);
    expect(next?.textContent).toContain('While autopilot is off, each pull request waits for your approval');
    expect(next?.querySelector('a[href="/contribute"]')).not.toBeNull();
    expect(next?.querySelector('a[href="/contribute/mcp"]')?.textContent).toBe('The MCP docs');
    // Cancel keeps its place, off: the lines under the buttons do not move.
    expect(container.querySelector('a[data-authorize="cancel"]')).toBeNull();
    expect(container.querySelector<HTMLButtonElement>('button[data-authorize="cancel"]')?.disabled).toBe(true);
  });

  it('shows no next step when the address is not one we allow', async () => {
    approve.mockResolvedValue({ ok: true, data: { redirectTo: 'javascript:alert(1)' } });
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Cursor" />));

    await click('[data-authorize="allow"]');

    expect(assign).not.toHaveBeenCalled();
    expect(container.querySelector('[data-authorize-next]')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("We can't send you back to this app");
  });

  it("gives the review sign-in's Allow the same next step, for the app it connected", async () => {
    approveAsReviewer.mockResolvedValue({ ok: true, data: { redirectTo: APP_REDIRECT } });
    act(() => root.render(<AuthorizeReviewSignIn requestId={ID} />));
    const field = (name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    act(() => {
      field('username')!.value = 'reviewer';
      field('password')!.value = 'review-password';
    });

    await click('[data-authorize="review-allow"]');

    expect(approveAsReviewer).toHaveBeenCalledWith(ID, 'reviewer', 'review-password');
    expect(assign).toHaveBeenCalledWith(APP_REDIRECT);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Allowed. Go back to the app: it is connected.',
    );
    const next = container.querySelector('[data-authorize-next]');
    expect(next?.textContent).toContain('Prompt for your agent');
    expect(next?.querySelector('pre')?.textContent).toBe(AGENT_FIRST_PROMPT);
    expect(next?.querySelector('a[href="/contribute/mcp"]')).not.toBeNull();
  });
});

describe('after Allow, by the client’s kind and the signs', () => {
  /** A callback on this computer: a terminal agent's. */
  const LOOPBACK_REDIRECT = 'http://127.0.0.1:33418/callback?code=c0de';
  const SETUP_LINE =
    'Your agent is connected. One step left before it can take an issue: a 2-minute setup that shows how you approve its pull requests.';
  let tab: { opener: unknown; closed: boolean; location: { href: string }; close: ReturnType<typeof vi.fn> };
  let open: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tab = { opener: window, closed: false, location: { href: 'about:blank' }, close: vi.fn() };
    open = vi.fn(() => tab);
    vi.stubGlobal('open', open);
  });

  const status = () => container.querySelector('[role="status"]')?.textContent;
  const finish = () => container.querySelector<HTMLAnchorElement>('[data-authorize="finish-setup"]');

  it('a terminal agent with neither sign: the way back opens in a new tab, and the page stays with the step left', async () => {
    let answer: (value: unknown) => void = () => {};
    approve.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Claude Code" kind="LOOPBACK" setup />));

    act(() => container.querySelector<HTMLButtonElement>('[data-authorize="allow"]')?.click());
    // Opened in the press, before the approval answers, with no way back to this page.
    expect(open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(approve.mock.invocationCallOrder[0]);
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe('about:blank');
    await act(async () => answer({ ok: true, data: { redirectTo: LOOPBACK_REDIRECT } }));

    expect(tab.location.href).toBe(LOOPBACK_REDIRECT);
    expect(assign).not.toHaveBeenCalled();
    expect(status()).toBe(SETUP_LINE);
    expect(finish()?.getAttribute('href')).toBe('/contribute/start');
    expect(finish()?.textContent).toBe('Finish setting up');
    expect(container.querySelector('[data-authorize-setup] [data-authorize-back]')?.textContent).toBe(
      'Started on gitranks.com? Go back to that tab: it moves on by itself.',
    );
    expect(container.querySelector('[data-authorize-next]')).toBeNull();
  });

  it('a terminal agent, the new tab blocked: as before the signs, the page goes back to the agent', async () => {
    open.mockReturnValue(null);
    approve.mockResolvedValue({ ok: true, data: { redirectTo: LOOPBACK_REDIRECT } });
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Claude Code" kind="LOOPBACK" setup />));
    await click('[data-authorize="allow"]');
    expect(assign).toHaveBeenCalledWith(LOOPBACK_REDIRECT);
    expect(status()).toBe('Allowed. Go back to Claude Code: it is connected.');
    expect(finish()).toBeNull();
  });

  it('a terminal agent, the new tab closed before the approval answers: the page goes back to the agent', async () => {
    let answer: (value: unknown) => void = () => {};
    approve.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Claude Code" kind="LOOPBACK" setup />));
    act(() => container.querySelector<HTMLButtonElement>('[data-authorize="allow"]')?.click());
    tab.closed = true;
    await act(async () => answer({ ok: true, data: { redirectTo: LOOPBACK_REDIRECT } }));
    expect(tab.location.href).toBe('about:blank');
    expect(assign).toHaveBeenCalledWith(LOOPBACK_REDIRECT);
    expect(status()).toBe('Allowed. Go back to Claude Code: it is connected.');
    expect(finish()).toBeNull();
  });

  it('closes the new tab on an error, and on an address it does not allow, and says why as before', async () => {
    approve.mockResolvedValue({ ok: false, error: 'FAILED', message: 'Not allowed now.' });
    act(() => root.render(<AuthorizeActions requestId={ID} kind="LOOPBACK" setup />));
    await click('[data-authorize="allow"]');
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Not allowed now.');
    expect(status()).toBeUndefined();

    approve.mockResolvedValue({ ok: true, data: { redirectTo: 'javascript:alert(1)' } });
    await click('[data-authorize="allow"]');
    expect(tab.close).toHaveBeenCalledTimes(2);
    expect(tab.location.href).toBe('about:blank');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("We can't send you back to this app");
  });

  it('closes the new tab when the approval throws', async () => {
    approve.mockRejectedValue(new Error('offline'));
    act(() => root.render(<AuthorizeActions requestId={ID} kind="LOOPBACK" setup />));
    await click('[data-authorize="allow"]');
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('a desktop app with neither sign: the app opens, and the page stays with the step left', async () => {
    approve.mockResolvedValue({ ok: true, data: { redirectTo: APP_REDIRECT } });
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Cursor" kind="SCHEME" setup />));
    await click('[data-authorize="allow"]');
    expect(open).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(APP_REDIRECT);
    expect(status()).toBe(SETUP_LINE);
    expect(finish()).not.toBeNull();
  });

  it.each([['KNOWN'], ['WEB']] as const)('a web app (%s) with neither sign: back at once, as before', async (kind) => {
    approve.mockResolvedValue({ ok: true, data: { redirectTo: 'https://claude.ai/api/mcp/auth_callback?code=c0de' } });
    act(() => root.render(<AuthorizeActions requestId={ID} clientName="Claude" kind={kind} setup />));
    await click('[data-authorize="allow"]');
    expect(open).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=c0de');
    expect(finish()).toBeNull();
  });

  it.each([['LOOPBACK'], ['SCHEME'], ['WEB']] as const)(
    'anyone with a sign (%s): as before the signs',
    async (kind) => {
      approve.mockResolvedValue({ ok: true, data: { redirectTo: APP_REDIRECT } });
      act(() => root.render(<AuthorizeActions requestId={ID} clientName="Cursor" kind={kind} />));
      await click('[data-authorize="allow"]');
      expect(open).not.toHaveBeenCalled();
      expect(assign).toHaveBeenCalledWith(APP_REDIRECT);
      expect(status()).toBe('Allowed. Go back to Cursor: it is connected.');
      expect(container.querySelector('[data-authorize-next] pre')?.textContent).toBe(AGENT_FIRST_PROMPT);
      expect(finish()).toBeNull();
    },
  );

  it('the review sign-in keeps the page as before the signs: no new tab, no setup', async () => {
    approveAsReviewer.mockResolvedValue({ ok: true, data: { redirectTo: LOOPBACK_REDIRECT } });
    act(() => root.render(<AuthorizeReviewSignIn requestId={ID} />));
    const field = (name: string) => container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    act(() => {
      field('username')!.value = 'reviewer';
      field('password')!.value = 'review-password';
    });
    await click('[data-authorize="review-allow"]');
    expect(open).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(LOOPBACK_REDIRECT);
    expect(status()).toBe('Allowed. Go back to the app: it is connected.');
    expect(finish()).toBeNull();
  });
});

describe('no profile yet', () => {
  it('offers Cancel, the docs and the contact address', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'no-profile', requestId: ID }} />);
    expect(html).toContain('data-authorize="cancel"');
    expect(html).toContain('href="/contribute/mcp"');
    expect(html).toContain(`href="mailto:${CONTACT_EMAIL}"`);
  });
});
