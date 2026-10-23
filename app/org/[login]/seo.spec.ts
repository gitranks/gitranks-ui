import { describe, expect, it } from 'vitest';

import { buildOrgPulseMetadata } from './seo';

type Org = Parameters<typeof buildOrgPulseMetadata>[0];

const org = (overrides: Partial<Org> = {}): Org => ({
  githubId: '1',
  login: 'Acme-Org',
  name: 'Acme',
  updatedAt: '2026-10-18T00:00:00.000Z',
  hasActivity: true,
  ...overrides,
});

describe('buildOrgPulseMetadata', () => {
  it('titles and canonicalizes the Pulse tab on the stored login', () => {
    const metadata = buildOrgPulseMetadata(org());

    expect(metadata.title).toBe('Acme - Pulse');
    expect(metadata.alternates?.canonical).toBe('/org/Acme-Org/pulse');
    expect(metadata.description).toContain('Activity by type for the Acme organization');
  });

  it('keeps the page out of the index but lets crawlers follow its links', () => {
    expect(buildOrgPulseMetadata(org()).robots).toEqual({ index: false, follow: true });
  });

  it('falls back to the login without a name', () => {
    expect(buildOrgPulseMetadata(org({ name: null })).title).toBe('Acme-Org - Pulse');
  });

  it('returns nothing without a login', () => {
    expect(buildOrgPulseMetadata(org({ login: null }))).toEqual({});
  });
});
