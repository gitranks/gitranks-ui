// @vitest-environment jsdom
import type { Route } from 'next';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, push } = vi.hoisted(() => ({ hint: { present: false }, push: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { LearnFromIt } = await import('./learn-from-it');
const { FIX_PR, learnFix, learnFixNoLesson, marksDone, marksFixer, marksHalfWay } = await import(
  '@/lib/learn/__fixtures__/fix-page'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = ((query: string) => ({
  matches: true,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

const PULL_REQUEST = '/my/pull-requests/driftwood-js/driftwood/871?from=learn' as Route;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
beforeEach(() => {
  hint.present = false;
  push.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

const draw = (node: ReactNode) =>
  act(async () => {
    root.render(node);
  });
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const words = (selector: string) => $(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const change = <section data-change="">The change</section>;
const enter = () =>
  act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  });

describe('"Learn from it" for a visitor', () => {
  it('offers the walkthrough and the lesson side by side, the walkthrough the main action, and asks nothing', async () => {
    await draw(
      <LearnFromIt pr={FIX_PR} fix={learnFix} pullRequest={PULL_REQUEST}>
        {change}
      </LearnFromIt>,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('[data-fix-learn]')?.className).toContain('sm:grid-cols-2');
    expect($('[data-fix-learn-card="walkthrough"]')?.hasAttribute('data-main')).toBe(true);
    expect(words('[data-fix-card-button="walkthrough"]')).toBe('Start the walkthrough⏎');
    expect(words('[data-fix-card-button="lesson"]')).toBe('Learn the lesson');
    expect(words('[data-fix-learn-card="lesson"]')).toContain(
      'The idea this fix uses, taught on its own. Part of Algorithms and data structures.',
    );
    // The marks' places are there, empty: nothing moves when they fill.
    expect($('[data-fix-learn-card="walkthrough"] .min-h-6')).not.toBeNull();
    expect($('[data-change]')).not.toBeNull();
    expect($('[data-fix-similar]')).toBeNull();
    await enter();
    expect(push).toHaveBeenCalledWith('/learn/fixes/driftwood-js/driftwood/1419/walkthrough');
  });

  it('draws the walkthrough alone, full width, for a fix with no lesson', async () => {
    await draw(
      <LearnFromIt pr={FIX_PR} fix={learnFixNoLesson} pullRequest={PULL_REQUEST}>
        {change}
      </LearnFromIt>,
    );
    expect(host.querySelectorAll('[data-fix-learn-card]')).toHaveLength(1);
    expect($('[data-fix-learn]')?.className).not.toContain('sm:grid-cols-2');
  });
});

describe('"Learn from it" for a signed-in person', () => {
  it('reads their marks in the browser and fills the fixed places, then lists their similar issues after the change', async () => {
    hint.present = true;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ marks: marksHalfWay, reads: null })));
    await draw(
      <LearnFromIt pr={FIX_PR} fix={learnFix} pullRequest={PULL_REQUEST}>
        {change}
      </LearnFromIt>,
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/fixes/driftwood-js/driftwood/1419/marks', {
      cache: 'no-store',
    });
    expect(words('[data-fix-mark="walkthrough"]')).toBe('2 of 4 answered');
    expect(words('[data-fix-card-button="walkthrough"]')).toBe('Continue the walkthrough⏎');
    const similar = $('[data-fix-similar]');
    expect(similar).not.toBeNull();
    // After the change: what only a signed-in person sees never moves the parts above it.
    expect($('[data-change]')!.compareDocumentPosition(similar!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.querySelectorAll('[data-fix-similar-row]')).toHaveLength(2);
    expect(words('[data-fix-similar-row="SAME_LESSON"]')).toContain('Uses the same lesson.');
  });

  it('moves the main action on once both are done, and asks for no Enter without a similar issue', async () => {
    await draw(
      <LearnFromIt
        pr={FIX_PR}
        fix={learnFix}
        pullRequest={PULL_REQUEST}
        initial={{ marks: { ...marksDone, similar: [] }, reads: null }}
      >
        {change}
      </LearnFromIt>,
    );
    expect($('[data-main]')).toBeNull();
    expect(words('[data-fix-mark="walkthrough"]')).toBe('Passed 3 Dec');
    expect(words('[data-fix-mark="lesson"]')).toBe('Learned 28 Nov');
    await enter();
    expect(push).not.toHaveBeenCalled();
  });

  it("tells the fixer this is their fix's public page, and why their walkthrough is not shown when held", async () => {
    await draw(
      <LearnFromIt
        pr={FIX_PR}
        fix={learnFix}
        pullRequest={PULL_REQUEST}
        initial={{ marks: { ...marksFixer, held: true }, reads: null }}
      >
        {change}
      </LearnFromIt>,
    );
    expect(words('[data-fix-fixer]')).toContain('This is the public page of your fix. Anyone can open it.');
    expect($('[data-fix-fixer] a')?.getAttribute('href')).toBe(PULL_REQUEST);
    expect($('[data-fix-held]')).not.toBeNull();
    expect(words('[data-fix-card-link="walkthrough"]')).toBe('See your answers');
  });

  it('stays as a visitor sees it when the read fails', async () => {
    hint.present = true;
    fetchMock.mockRejectedValue(new Error('down'));
    await draw(
      <LearnFromIt pr={FIX_PR} fix={learnFix} pullRequest={PULL_REQUEST}>
        {change}
      </LearnFromIt>,
    );
    expect(words('[data-fix-card-button="walkthrough"]')).toBe('Start the walkthrough⏎');
    expect($('[data-fix-similar]')).toBeNull();
    expect($('[data-fix-fixer]')).toBeNull();
  });
});
