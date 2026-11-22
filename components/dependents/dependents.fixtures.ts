import type { RepoPackage, RepoPackages, RepoUsedBy, RepoUsedByItem } from '@/graphql/repo-packages';

/** A package `nebula/ui` publishes. */
const pkg = (name: string, dependents: number, downloadsLastWeek: number): RepoPackage => ({
  registry: 'NPM',
  name,
  dependents,
  downloadsLastWeek,
});

const READ = {
  dependentsReadAt: '2026-11-16T03:00:00Z',
  nextDependentsReadAt: '2026-12-16T03:00:00Z',
  downloadsReadAt: '2026-11-17T05:00:00Z',
};

/** Three packages, 231 repositories with 100+ stars using at least one of them. */
export const threePackages: RepoPackages = {
  total: 3,
  items: [pkg('@nebula/ui', 214, 412_880), pkg('@nebula/icons', 61, 96_140), pkg('@nebula/tokens', 9, 18_302)],
  dependents: 231,
  dependentsArchived: 1,
  downloadsLastWeek: 527_322,
  downloadsLastMonth: 0,
  ...READ,
};

/** One package, read on the same day as its downloads. */
export const onePackage: RepoPackages = {
  total: 1,
  items: [pkg('@nebula/ui', 214, 412_880)],
  dependents: 214,
  dependentsArchived: 1,
  downloadsLastWeek: 412_880,
  downloadsLastMonth: 0,
  ...READ,
  downloadsReadAt: READ.dependentsReadAt,
};

/** Five packages, one of them with no dependent yet. */
export const fivePackages: RepoPackages = {
  total: 5,
  items: [
    pkg('@nebula/ui', 214, 412_880),
    pkg('@nebula/icons', 61, 96_140),
    pkg('@nebula/charts', 37, 54_210),
    pkg('@nebula/tokens', 9, 18_302),
    pkg('@nebula/cli', 0, 2_118),
  ],
  dependents: 252,
  dependentsArchived: 1,
  downloadsLastWeek: 583_668,
  downloadsLastMonth: 0,
  ...READ,
  downloadsReadAt: READ.dependentsReadAt,
};

/** One package that no repository with 100+ stars uses yet. */
export const noDependents: RepoPackages = {
  total: 1,
  items: [pkg('@nebula/ui', 0, 2_118)],
  dependents: 0,
  dependentsArchived: 0,
  downloadsLastWeek: 2_118,
  downloadsLastMonth: 0,
  ...READ,
  dependentsReadAt: null,
  downloadsReadAt: null,
};

const row = (nameWithOwner: string, stars: number, uses: string[], archived = false): RepoUsedByItem => ({
  nameWithOwner,
  ownerAvatarUrl: null,
  stars,
  archived,
  uses,
});

/** The most-starred repositories that use `nebula/ui`'s packages; one is archived. */
export const dependentRows: RepoUsedByItem[] = [
  row('orbit-hq/console', 48_210, ['@nebula/ui', '@nebula/icons']),
  row('lumen-labs/studio', 21_877, ['@nebula/ui']),
  row('kestrel/admin-kit', 9_644, ['@nebula/ui', '@nebula/tokens']),
  row('pinecrest/notes', 6_120, ['@nebula/icons']),
  row('harbor-dev/harbor', 3_388, ['@nebula/ui']),
  row('tern-io/dashboards', 2_954, ['@nebula/ui']),
  row('quill-app/editor', 2_411, ['@nebula/ui', '@nebula/icons'], true),
  row('sable/crm', 1_980, ['@nebula/ui']),
  row('fjord-labs/fjord', 1_534, ['@nebula/tokens']),
  row('mossy/wiki', 1_207, ['@nebula/ui']),
  row('cobalt-dev/forms', 988, ['@nebula/ui']),
  row('ember-js-tools/inspect', 861, ['@nebula/icons']),
];

/** The first page of the list: 12 rows of 231, one archived. */
export const firstPage: RepoUsedBy = { total: 231, archived: 1, items: dependentRows };
