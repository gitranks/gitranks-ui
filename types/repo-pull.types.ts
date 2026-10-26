/** The answer to a press of "Fetch star history"; dates arrive as ISO strings. */
export type RepoPullResult =
  | { status: 'started'; pullId: string; nextAt?: string }
  | { status: 'not_eligible' }
  | { status: 'up_to_date' }
  | { status: 'not_ready'; until: string }
  | { status: 'running' }
  | { status: 'used'; nextAt: string }
  | { status: 'blocked'; until: string }
  | { status: 'not_starred' }
  | { status: 'busy' }
  | { status: 'quota'; nextAt: string };

export type RepoPullState = {
  id: string;
  status: 'running' | 'done' | 'failed';
  via: string;
  requestedAt: string;
  finishedAt: string | null;
  failure: string | null;
};

/** What the visitor may still fetch: one a day after a star, or a number a day with their own token. */
export type RepoPullAllowance = {
  daily: { available: boolean; nextAt: string | null };
  token: { used: number; limit: number; nextAt: string | null };
};

export type RepoPullStatus = { pull: RepoPullState | null; allowance: RepoPullAllowance | null };
