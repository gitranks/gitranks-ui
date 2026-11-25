import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/setup.actions', () => ({ retryContributeSetup: vi.fn() }));

const { OnboardingNoProfile } = await import('./setup-no-profile');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Words a person must never read here: an hour's wait, a claim, the long dash. */
const NEVER = /hour|claim|—/i;

/** The panel as drawn for a state: its markup and its words. */
const draw = (state: 'setting-up' | 'failed' | 'removed') => {
  const html = renderToStaticMarkup(<OnboardingNoProfile state={state} />);
  return { html, plain: text(html) };
};

describe("Learn's setup for an account with no profile yet", () => {
  it("stands in the onboarding's frame, on its first step, for every state", () => {
    for (const state of ['setting-up', 'failed', 'removed'] as const) {
      const { html, plain } = draw(state);
      expect(html).toContain('data-flow="learn"');
      expect(html).toMatch(/aria-current="step"[^>]*>[\s\S]*?How Learn works/);
      expect(plain).toContain('GitRanks Learn');
      expect(plain).not.toMatch(NEVER);
    }
  });

  it('shows the setting-up panel, which reads the page again, while the first read is on its way', () => {
    const { html, plain } = draw('setting-up');
    expect(html).toContain('data-contribute-setting-up');
    expect(plain).toContain('Setting up your GitRanks account');
    expect(plain).toContain('this page updates by itself');
    expect(html).not.toContain('data-setup-retry');
  });

  it('shows the error with Try again once the first read failed', () => {
    const { html, plain } = draw('failed');
    expect(html).toContain('data-contribute-setup-failed');
    expect(plain).toContain('We could not set up your GitRanks account');
    expect(html).toContain('data-setup-retry');
  });

  it('says Learn is not open to an account GitRanks does not read, with nothing to try', () => {
    const { html, plain } = draw('removed');
    expect(html).toContain('data-contribute-no-profile');
    expect(plain).toContain('GitRanks does not read your GitHub account, so Learn is not open to it.');
    expect(plain).not.toMatch(/try again/i);
  });
});
