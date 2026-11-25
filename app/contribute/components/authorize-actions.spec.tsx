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

describe('no profile yet', () => {
  it('offers Cancel, the docs and the contact address', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'no-profile', requestId: ID }} />);
    expect(html).toContain('data-authorize="cancel"');
    expect(html).toContain('href="/contribute/mcp"');
    expect(html).toContain(`href="mailto:${CONTACT_EMAIL}"`);
  });
});
