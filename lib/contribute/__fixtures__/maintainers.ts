import type { ContributeMaintainerRepo } from '@/lib/contribute/contribute.types';

/** A repo the maintainers page lists for the signed-in visitor. */
export const maintainerRepo = (patch: Partial<ContributeMaintainerRepo>): ContributeMaintainerRepo => ({
  repoId: 'R_1',
  nameWithOwner: 'driftwood-js/driftwood',
  permission: 'ADMIN',
  stars: 12_345,
  isArchived: false,
  optedOut: false,
  optedOutAt: null,
  ...patch,
});
