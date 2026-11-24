import { isValidElement, type ReactElement, type ReactNode, Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/components/workspace/origin-header', () => ({ OriginHeader: () => null }));
vi.mock('@/components/workspace/my-gate', () => ({ MyGate: () => null }));

const { default: PlayerMyLayout, metadata } = await import('./layout');
const { default: PlayerLearnLayout } = await import('../learn/layout');
const { Header } = await import('@/components/header/header');
const { OriginHeader } = await import('@/components/workspace/origin-header');
const { MyGate } = await import('@/components/workspace/my-gate');
const { default: playerMyError } = await import('./error');
const { SharedPageError } = await import('@/components/workspace/try-again');

type Parts = ReactElement<{ children: ReactNode[] }>;
const partsOf = (layout: ReactElement) => (layout as Parts).props.children;

describe("the player's layouts", () => {
  it('under /my: the header of the product the person came from, the plain header until it is known', () => {
    const [header, page] = partsOf(PlayerMyLayout({ children: <main /> }));
    expect(isValidElement(header) && header.type).toBe(Suspense);
    const { fallback, children } = (header as ReactElement<{ fallback: ReactElement; children: ReactElement }>).props;
    expect(fallback.type).toBe(Header);
    expect(fallback.props).toEqual({});
    expect(children.type).toBe(OriginHeader);
    // The page behind the gate every page under /my has.
    expect(isValidElement(page) && page.type).toBe(MyGate);
    expect((page as ReactElement<{ children: ReactNode }>).props.children).toEqual(<main />);
  });

  it('under /my: never indexed, and a "try again" that names neither product', () => {
    expect(metadata).toEqual({ robots: { index: false, follow: false } });
    expect(playerMyError).toBe(SharedPageError);
  });

  it("Learn's review and check: the header with Learn marked, as before", () => {
    const [header, page] = partsOf(PlayerLearnLayout({ children: <main /> }));
    expect(isValidElement(header) && header.type).toBe(Header);
    expect((header as ReactElement<{ section: string }>).props.section).toBe('learn');
    expect(page).toEqual(<main />);
  });
});
