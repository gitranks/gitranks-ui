import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PackageBadges } from './package-badge-section';
import { packageBig } from '@/badge/v3/fixtures';

const { loadBadgePackageCard } = vi.hoisted(() => ({ loadBadgePackageCard: vi.fn() }));
vi.mock('@/badge/v3/load', () => ({ loadBadgePackageCard }));

const render = async (name: string) =>
  renderToStaticMarkup((await (PackageBadges as (props: { name: string }) => Promise<ReactElement>)({ name })) ?? null);

describe('PackageBadgeSection', () => {
  it("draws the package's Badges card from its badge data", async () => {
    loadBadgePackageCard.mockResolvedValueOnce(packageBig);
    const html = await render('react-resize-detector');

    expect(loadBadgePackageCard).toHaveBeenCalledWith('react-resize-detector');
    expect(html).toContain('All package badges');
    expect(html).toContain('/badge/package/npm/react-resize-detector/used-by.svg?theme=light');
  });

  it('draws nothing without badge data', async () => {
    loadBadgePackageCard.mockResolvedValueOnce(null);
    expect(await render('react-resize-detector')).toBe('');
  });
});
