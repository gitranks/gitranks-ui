import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const stub =
  (name: string) =>
  ({ promo }: { promo?: unknown }) => <div data-part={name} data-promo={promo ? '' : undefined} />;

vi.mock('@/components/header/header', () => ({ Header: stub('header') }));
vi.mock('./landing-sections', () => ({
  BadgesSection: stub('badges'),
  Container: ({ children }: { children: unknown }) => <div data-part="container">{children as never}</div>,
  FaqSection: stub('faq'),
  Hero: stub('hero'),
  InsightsSection: stub('insights'),
  InsightTicker: stub('ticker'),
  LeaderboardSection: stub('leaderboard'),
  OrganizationsSection: stub('orgs'),
  PlacesSection: stub('places'),
  SupportStrip: stub('support'),
  TiersSection: stub('tiers'),
  UpdatesSection: stub('updates'),
}));
vi.mock('./packages-section', () => ({ PackagesSection: stub('packages') }));
vi.mock('./repos-section', () => ({ ReposSection: stub('repos') }));
vi.mock('./landing-promos', () => ({ LandingPromos: stub('learn-promos') }));
vi.mock('./products-block-live', () => ({ ProductsBlockLive: stub('products-block') }));

const { landingData } = await import('./__fixtures__/landing');
const { LandingScreen } = await import('./landing-screen');
const { landingPromo } = await import('@/lib/learn/__fixtures__/promo');

/** The page's parts, top to bottom, by name. */
const partsOf = (html: string) => [...html.matchAll(/data-part="([a-z-]+)"/g)].map((match) => match[1]);

describe('LandingScreen', () => {
  it("is today's page while Learn is not open to everyone: no block, and Learn's suggestion after the packages", () => {
    for (const learn of [undefined, { forVisitors: false }, { promo: landingPromo }]) {
      const parts = partsOf(renderToStaticMarkup(<LandingScreen {...landingData} learn={learn} />));
      expect(parts).not.toContain('products-block');
      expect(parts.slice(0, 6)).toEqual(['header', 'ticker', 'hero', 'container', 'packages', 'learn-promos']);
    }
    const html = renderToStaticMarkup(<LandingScreen {...landingData} learn={{ promo: landingPromo }} />);
    expect(html).toContain('data-part="learn-promos" data-promo=""');
  });

  it('draws the block directly under the hero once Learn is open to everyone, in the place of the suggestion', () => {
    const parts = partsOf(renderToStaticMarkup(<LandingScreen {...landingData} learn={{ forVisitors: true }} />));
    expect(parts.slice(0, 6)).toEqual(['header', 'ticker', 'hero', 'products-block', 'container', 'packages']);
    expect(parts).not.toContain('learn-promos');
    expect(parts.filter((part) => part === 'products-block')).toHaveLength(1);
  });

  it('keeps the block under the hero when no package ranking could be read', () => {
    const parts = partsOf(
      renderToStaticMarkup(<LandingScreen {...landingData} packages={null} learn={{ forVisitors: true }} />),
    );
    expect(parts.slice(0, 6)).toEqual(['header', 'ticker', 'hero', 'products-block', 'container', 'leaderboard']);
  });
});
