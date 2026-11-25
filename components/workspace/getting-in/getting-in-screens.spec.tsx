// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const { FlowSteps } = await import('./flow-steps');
const { FlowFrame } = await import('./flow-frame');
const { FlowBackHere } = await import('./flow-back-here');
const { MaskedIssueRow } = await import('@/components/workspace/masked-issue/masked-issue-row');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');
const { FlowBookmark, FlowExit, forgetFlowBookmark, readFlowBookmark } = await import('./flow-bookmark');
const { ResumeLink } = await import('./resume-link');
const { BOOKMARK_KEY } = await import('@/lib/workspace/getting-in-bookmark');
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
      ['done', 'Done: Your agent'],
      ['current', '2Your first issue'],
    ]);
    expect(doc.querySelector('[aria-current="step"]')?.textContent).toContain('Your first issue');
    expect(doc.querySelectorAll('[aria-current]')).toHaveLength(1);

    const first = renderToStaticMarkup(<FlowSteps side="contribute" current={1} />);
    expect(new DOMParser().parseFromString(first, 'text/html').querySelector('[aria-current]')?.textContent).toBe(
      '1Your agent',
    );
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

describe('the way back to an issue on a step’s links', () => {
  it('"Two ways" keeps the address’s way back, and drops anything that is not an issue’s id', async () => {
    window.history.replaceState(null, '', '/contribute/start/agent/key?issue=q7k2m9xa');
    await render(<FlowBackHere href={GETTING_IN_PATHS.contributeStart}>Two ways</FlowBackHere>);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/contribute/start?issue=q7k2m9xa');

    window.history.replaceState(null, '', '/contribute/start/agent/key?issue=%2F%2Fevil.example');
    await render(<FlowBackHere href={GETTING_IN_PATHS.contributeStart}>Two ways</FlowBackHere>);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/contribute/start');
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
    expect(readFlowBookmark('contribute')).toBe('/contribute/start/issue');
    expect(JSON.parse(window.localStorage.getItem(BOOKMARK_KEY) ?? '{}')).not.toHaveProperty('learn');
    forgetFlowBookmark('contribute');
    expect(window.localStorage.getItem(BOOKMARK_KEY)).toBeNull();
  });

  it('is forgotten when a Start or a marked way out inside the step is clicked, not on other clicks', async () => {
    window.history.replaceState(null, '', '/contribute/start/issue');
    await render(
      <>
        <FlowBookmark side="contribute" />
        <FlowExit side="contribute">
          <button type="button" data-more="">
            Show 10 more
          </button>
          <button type="button" data-start-control="hosted">
            Start
          </button>
        </FlowExit>
      </>,
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[data-more]')?.click());
    expect(readFlowBookmark('contribute')).toBe('/contribute/start/issue');
    await act(async () => container.querySelector<HTMLButtonElement>('[data-start-control]')?.click());
    expect(readFlowBookmark('contribute')).toBeNull();
  });

  it('a masked row’s "See the full issue" is a way out inside the step, and only there', async () => {
    window.history.replaceState(null, '', '/contribute/start/issue');
    await render(<MaskedIssueRow issue={maskedIssue()} />);
    expect(container.querySelector('[data-flow-leave]')).toBeNull();

    await render(
      <>
        <FlowBookmark side="contribute" />
        <FlowExit side="contribute">
          <MaskedIssueRow issue={maskedIssue()} />
        </FlowExit>
      </>,
    );
    const see = container.querySelector<HTMLAnchorElement>('[data-flow-leave]');
    expect(see?.textContent).toContain('See the full issue');
    expect(readFlowBookmark('contribute')).toBe('/contribute/start/issue');
    see?.addEventListener('click', (event) => event.preventDefault());
    await act(async () => see?.click());
    expect(readFlowBookmark('contribute')).toBeNull();
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
