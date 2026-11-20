// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));

const { FlowSteps } = await import('./flow-steps');
const { FlowFrame } = await import('./flow-frame');
const { FlowSignIn } = await import('./flow-sign-in');
const { FlowBookmark, forgetFlowBookmark, readFlowBookmark } = await import('./flow-bookmark');
const { ResumeLink } = await import('./resume-link');
const { BOOKMARK_KEY } = await import('@/lib/workspace/getting-in-bookmark');
const { IDENTITY_PROVIDER } = await import('@/lib/auth-providers');
const { GETTING_IN_PATHS } = await import('@/lib/workspace/paths');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  window.localStorage.clear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const render = (node: ReactNode) => act(async () => root.render(node));

describe('the line of steps', () => {
  it('checks the steps before, fills the current one and outlines the rest', () => {
    const html = renderToStaticMarkup(<FlowSteps side="contribute" current={2} />);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const steps = [...doc.querySelectorAll('li')].map((li) => [li.dataset.stepState, li.textContent]);
    expect(steps).toEqual([
      ['done', 'Done: What you work on'],
      ['current', '2Your agent'],
      ['next', '3Your first issue'],
    ]);
    expect(doc.querySelector('[aria-current="step"]')?.textContent).toContain('Your agent');
    expect(doc.querySelectorAll('[aria-current]')).toHaveLength(1);
  });

  it('names Learn’s steps', () => {
    const html = renderToStaticMarkup(<FlowSteps side="learn" current={1} />);
    expect(html).toContain('Your goal');
    expect(html).toContain('Pick an issue');
    expect(html).toContain('Your agent');
  });

  it('frames a step with no tabs, the line of steps over one narrow column', () => {
    const html = renderToStaticMarkup(
      <FlowFrame side="contribute" step={1}>
        <p>step</p>
      </FlowFrame>,
    );
    expect(html).toContain('data-flow-steps="contribute"');
    expect(html).toContain('max-w-3xl');
    expect(html).not.toContain('role="tablist"');
  });
});

describe('the flow’s sign-in card', () => {
  it('says why, what GitHub shares, and signs in back to this very address with its answers', async () => {
    window.history.replaceState(null, '', '/contribute/start/agent?languages=go&kinds=bug');
    await render(
      <FlowSignIn
        title="Sign in to connect an agent"
        text="Your account is needed from this step."
        source="contribute_flow_sign_in"
      />,
    );
    expect(container.textContent).toContain('Sign in to connect an agent');
    expect(container.textContent).toContain('GitHub shares your public profile and email with us, read-only.');
    const button = container.querySelector<HTMLButtonElement>('[data-sign-in="flow"]');
    expect(button?.dataset.contributeSource).toBe('contribute_flow_sign_in');
    await act(async () => button?.click());
    expect(signIn).toHaveBeenCalledWith(IDENTITY_PROVIDER, {
      redirectTo: '/contribute/start/agent?languages=go&kinds=bug',
    });
    expect(button?.disabled).toBe(true);
  });
});

describe('the bookmark in the browser', () => {
  it('notes the step shown, and a landing’s link resumes a visitor there', async () => {
    window.history.replaceState(null, '', '/contribute/start/agent?languages=rust');
    await render(<FlowBookmark side="contribute" />);
    expect(readFlowBookmark('contribute')).toBe('/contribute/start/agent?languages=rust');

    await render(
      <ResumeLink side="contribute" href="/contribute/start" signedIn={false}>
        Start contributing
      </ResumeLink>,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/contribute/start/agent?languages=rust');
  });

  it('a signed-in person’s link stays on the server’s step', async () => {
    window.history.replaceState(null, '', '/contribute/start');
    await render(<FlowBookmark side="contribute" />);
    await render(
      <ResumeLink side="contribute" href={GETTING_IN_PATHS.contributeAgent} signedIn>
        Start contributing
      </ResumeLink>,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/contribute/start/agent');
  });

  it('is forgotten when its person leaves the flow, and removed once too old', () => {
    window.localStorage.setItem(
      BOOKMARK_KEY,
      JSON.stringify({
        contribute: { href: '/contribute/start/issue', at: Date.now() },
        learn: { href: '/learn/start', at: Date.now() - 31 * 24 * 60 * 60 * 1000 },
      }),
    );
    expect(readFlowBookmark('learn')).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(BOOKMARK_KEY) ?? '{}')).not.toHaveProperty('learn');
    forgetFlowBookmark('contribute');
    expect(window.localStorage.getItem(BOOKMARK_KEY)).toBeNull();
  });

  it('with storage blocked keeps nothing and the link starts at the server’s step', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    window.history.replaceState(null, '', '/contribute/start/agent');
    await render(<FlowBookmark side="contribute" />);
    await render(
      <ResumeLink side="contribute" href="/contribute/start" signedIn={false}>
        Start contributing
      </ResumeLink>,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/contribute/start');
  });
});
