import type {
  ApplyPackage,
  ApplyRegistry,
  ApplyResolved,
  HeroApplication,
  HeroApplyView,
} from '@/lib/unsung-hero/apply.types';

// The apply page as the API answers it on Wednesday, October 28, 2026. Every account and package is made up.

export const REGISTRIES: ApplyRegistry[] = [
  { id: 'NPM', label: 'npm' },
  { id: 'PYPI', label: 'PyPI' },
  { id: 'CRATES', label: 'crates.io' },
  { id: 'PACKAGIST', label: 'Packagist' },
  { id: 'PUB', label: 'pub.dev' },
  { id: 'MAVEN', label: 'Maven Central' },
  { id: 'GO', label: 'Go' },
];

export const packageOf = (overrides: Partial<ApplyPackage> = {}): ApplyPackage => ({
  registry: 'NPM',
  name: 'tiny-clamp',
  displayName: null,
  repository: 'octocat/tiny-clamp',
  downloads: 2_400_000,
  downloadsPer: 'WEEK',
  dependents: 1_920,
  ...overrides,
});

/** The packages of the viewer's own repositories, most used first. */
export const MY_PACKAGES: ApplyPackage[] = [
  packageOf(),
  packageOf({
    registry: 'PYPI',
    name: 'tidy-env',
    repository: 'octocat/tidy-env',
    downloads: 4_500_000,
    downloadsPer: 'MONTH',
    dependents: 410,
  }),
  packageOf({ name: 'kebab-keys', repository: 'octocat/kebab-keys', downloads: 310_000, dependents: 88 }),
  packageOf({
    registry: 'CRATES',
    name: 'clamp_rs',
    displayName: 'clamp-rs',
    repository: 'octocat/clamp-rs',
    downloads: 9_000,
    dependents: 3,
  }),
];

/** Someone else's package, nominated by its registry link. */
export const FAST_DIFF = packageOf({
  name: 'fast-diff',
  repository: 'diff-tools/fast-diff',
  downloads: 3_100_000,
  dependents: 214,
});

export const FOUND: ApplyResolved = { status: 'FOUND', packages: [FAST_DIFF] };

export const AMBIGUOUS: ApplyResolved = {
  status: 'AMBIGUOUS',
  packages: [
    packageOf({ name: 'pathlike', repository: 'mona/pathlike', downloads: 1_200_000, dependents: 140 }),
    packageOf({
      registry: 'PYPI',
      name: 'pathlike',
      repository: 'hubot/pathlike',
      downloads: 800_000,
      downloadsPer: 'MONTH',
      dependents: 35,
    }),
  ],
};

export const NOT_FOUND: ApplyResolved = { status: 'NOT_FOUND', packages: [] };

export const applicationOf = (overrides: Partial<HeroApplication> = {}): HeroApplication => ({
  status: 'IN_REVIEW',
  package: packageOf(),
  typed: null,
  note: 'Most date pickers use it for clamping. I have maintained it alone since 2017.',
  sentAt: '2026-10-27T09:14:00.000Z',
  week: null,
  ...overrides,
});

/** Week 46: Monday, November 9 to Sunday, November 15. */
export const WEEK_46 = { startsAt: '2026-11-09T00:00:00.000Z', endsAt: '2026-11-16T00:00:00.000Z' };

export const viewOf = (overrides: Partial<HeroApplyView> = {}): HeroApplyView => ({
  registries: REGISTRIES,
  viewer: { login: 'octocat' },
  application: null,
  packages: MY_PACKAGES,
  ...overrides,
});

/** What a visitor's page reads: the registries alone. */
export const VISITOR_VIEW: HeroApplyView = { registries: REGISTRIES, viewer: null, application: null, packages: [] };
