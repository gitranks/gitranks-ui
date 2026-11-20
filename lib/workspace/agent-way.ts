import type { ContributeMcpToken } from './contribute.types';

const timeOf = (iso: string | null | undefined) => (iso ? Date.parse(iso) || 0 : 0);

/** The token the user's agent called with last; none before its first call. */
export const lastUsedTokenOf = (tokens: ContributeMcpToken[] | undefined): ContributeMcpToken | undefined =>
  (tokens ?? []).filter((token) => token.lastUsedAt).sort((a, b) => timeOf(b.lastUsedAt) - timeOf(a.lastUsedAt))[0];
