import { describe, expect, it } from 'vitest';

import {
  formatPackageChange,
  formatPackageDate,
  isPackageRankingOrder,
  PACKAGE_RANKING_ORDER_LIST,
  packageRankingFirstOrder,
  packageRankingOrdersOf,
  packageRankingRegistryOf,
} from './package-rankings';
import { REGISTRY_IDS } from '@/lib/packages/registries';
import { PACKAGE_RANKING_ORDERS, PACKAGE_REGISTRIES } from '@/lib/routing/ranking-routes';
import { PackageRegistry } from '@/types/generated/graphql';

describe('package rankings', () => {
  it('are the orders and registries the routing lets through', () => {
    expect([...PACKAGE_RANKING_ORDER_LIST].sort()).toEqual([...PACKAGE_RANKING_ORDERS].sort());
    expect([...REGISTRY_IDS].sort()).toEqual([...PACKAGE_REGISTRIES].sort());
  });

  it('give npm its three rankings, opening on downloads, and name it as the API does', () => {
    expect(packageRankingOrdersOf('npm')).toEqual(['downloads', 'dependents-stars', 'dependents']);
    expect(packageRankingFirstOrder('npm')).toBe('downloads');
    expect(packageRankingFirstOrder()).toBe('downloads');
    expect(packageRankingRegistryOf('npm')).toEqual({ id: 'npm', registry: PackageRegistry.Npm, label: 'npm' });
  });

  it('take an order or a registry only as spelled, never one inherited from an object', () => {
    expect(isPackageRankingOrder('dependents-stars')).toBe(true);
    expect(isPackageRankingOrder('Downloads')).toBe(false);
    expect(isPackageRankingOrder('toString')).toBe(false);
    expect(packageRankingRegistryOf('npm')?.label).toBe('npm');
    expect(packageRankingRegistryOf('NPM')).toBeNull();
    expect(packageRankingRegistryOf('constructor')).toBeNull();
  });

  it('write a change with its sign and a true minus', () => {
    expect(formatPackageChange(53_051)).toBe('+53,051');
    expect(formatPackageChange(-46_450)).toBe('−46,450');
    expect(formatPackageChange(0.3)).toBe('0');
  });

  it('write a date in UTC, and nothing for one that does not read', () => {
    expect(formatPackageDate('2026-11-16T23:30:00.000Z')).toBe('November 16, 2026');
    expect(formatPackageDate(null)).toBeNull();
    expect(formatPackageDate('soon')).toBeNull();
  });
});
