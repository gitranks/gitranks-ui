import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { githubLogin: 'octocat' } } }) }));
vi.mock('@/app/learn/actions', () => ({ dismissLearnPromo: vi.fn(async () => ({ ok: true, data: true })) }));

const { LearnSectionView } = await import('./learn-section');
const { LandingPromos, LandingPromosView } = await import('./landing-promos');
const { landingPromo } = await import('@/lib/learn/__fixtures__/promo');
const { LEARN_OPEN_TO_VISITORS } = await import('@/lib/learn/learn-path');

describe("the home page's Learn section", () => {
  it('shows a visitor the same pitch for everyone, into the front door, marked as the landing block', () => {
    const html = renderToStaticMarkup(<LearnSectionView />);
    expect(html).toContain('data-learn-promo="visitor"');
    expect(html).toContain('data-contribute-source="learn_promo_landing"');
    expect(html).toContain('Learn from real open-source fixes');
    expect(html).toContain('href="/learn"');
    expect(html).toContain('See how Learn works');
    expect(html).toContain('Example lesson');
    expect(html).not.toContain('Not for me');
  });

  it('tells a user it may suit why, about their language, with "Set my goal" and "Not for me"', () => {
    const html = renderToStaticMarkup(<LearnSectionView promo={landingPromo} />);
    expect(html).toContain('data-learn-promo="personal"');
    expect(html).toContain('data-contribute-source="learn_promo_signed_in"');
    expect(html).toContain('For you');
    expect(html).toContain('Learn TypeScript on real issues');
    expect(html).toContain(
      'You started your first TypeScript repo 3 weeks ago. Your agent fixes a real TypeScript issue, and you get a 10-minute lesson on the fix.',
    );
    expect(html).toContain('href="/learn/profile"');
    expect(html).toContain('Not for me');
    expect(html).toContain('Only you see this.');
  });

  it('reads without a reason or a language', () => {
    const html = renderToStaticMarkup(<LearnSectionView promo={{ reason: null, language: null, issues: [] }} />);
    expect(html).toContain('Learn on real open-source issues');
    expect(html).toContain(
      '<p class="max-w-prose text-muted-foreground lg:text-lg">Your agent fixes a real open-source',
    );
  });
});

describe("the home page's one suggestion", () => {
  it("is Contribute, then the visitors' Learn section, in the cached page, before anything is read", () => {
    const html = renderToStaticMarkup(<LandingPromos learnForVisitors={<LearnSectionView />} />);
    expect(html).toContain('aria-labelledby="contribute"');
    expect(html.indexOf('aria-labelledby="contribute"')).toBeLessThan(html.indexOf('data-learn-promo="visitor"'));
    expect(html).not.toContain('data-learn-promo="personal"');
  });

  it("is Learn's alone, in Contribute's place, for a user it may suit", () => {
    const html = renderToStaticMarkup(<LandingPromos learnForVisitors={<LearnSectionView />} promo={landingPromo} />);
    expect(html).toContain('data-learn-promo="personal"');
    expect(html).not.toContain('aria-labelledby="contribute"');
    expect(html).not.toContain('data-learn-promo="visitor"');
  });

  it("shows the visitors' section to visitors alone, and not again once Learn is turned down", () => {
    const view = (signedIn: boolean, dismissed: boolean) =>
      renderToStaticMarkup(
        <LandingPromosView
          learnForVisitors={<LearnSectionView />}
          promo={null}
          signedIn={signedIn}
          dismissed={dismissed}
        />,
      );
    expect(view(false, false)).toContain('data-learn-promo="visitor"');
    for (const html of [view(true, false), view(false, true)]) {
      expect(html).toContain('aria-labelledby="contribute"');
      expect(html).not.toContain('data-learn-promo');
    }
  });

  it("leaves the visitors' section out while Learn is not open to visitors", () => {
    expect(LEARN_OPEN_TO_VISITORS).toBe(false);
  });
});
