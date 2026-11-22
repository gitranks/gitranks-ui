import type { ApiHeroLink } from '../hero-links.documents';

/** A slot's token, of a stored token's shape: 43 base64url characters, as 32 random bytes are written. */
export const HERO_TOKEN = 'hErO_tOkEn-0123456789abcdefghijklmnopqrstuv';

/** A made-up week: an invented repository and maintainer. */
export const heroLinkOf = (overrides: Partial<ApiHeroLink> = {}): ApiHeroLink => ({
  state: 'UPCOMING',
  startsAt: '2026-11-23T00:00:00.000Z',
  endsAt: '2026-11-30T00:00:00.000Z',
  repo: {
    nameWithOwner: 'ada-fixture/line-trim-fixture',
    description: 'Trims trailing whitespace from every line',
    createdAt: '2019-01-14T09:00:00.000Z',
  },
  package: { registry: 'NPM', name: 'line-trim-fixture' },
  maintainer: { login: 'ada-fixture', name: 'Ada Fixture' },
  line: 'Ships inside @fixture-ui/editor',
  text: 'Trims trailing whitespace from every line. It ships inside @fixture-ui/editor, so it is probably in your app too.',
  facts: { weeklyDownloads: 41_200_000, contributors: 12 },
  stars: 512,
  starsAtStart: null,
  canOptOut: true,
  undoUntil: null,
  ...overrides,
});
