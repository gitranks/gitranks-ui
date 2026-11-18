import type {
  FollowChangeBody,
  FollowChannels,
  FollowChannelsView,
  FollowFailure,
  FollowPackage,
  FollowRow,
  FollowStartAnswer,
  FollowStartBody,
} from './follow.types';
import type { FollowingPress } from './following-session';
import type { SettingsState } from '@/lib/link-token/follow-pages';
import { DEFAULT_REGISTRY } from '@/lib/packages/registries';

// The browser's side of the follow routes. Each answers `{ ok: true, data }`, or `{ ok: false, failure }` for a refusal,
// a network error or an answer of another shape: the dialog says what failed and never throws.

export type FollowCall<T> = { ok: true; data: T } | { ok: false; failure: FollowFailure };

export const FOLLOW_ROUTES = {
  channels: '/api/follow/channels',
  state: '/api/follow/state',
  start: '/api/follow/start',
  change: '/api/follow/change',
  following: '/api/follow/following',
} as const;

const FAILURES: ReadonlySet<string> = new Set<FollowFailure>([
  'not_found',
  'sign_in',
  'invalid',
  'unavailable',
  'failed',
]);

/** What a reader answers for a body of another shape. */
const UNREAD = Symbol('unread');

async function call<T>(path: string, init: RequestInit | undefined, read: (body: unknown) => T | typeof UNREAD) {
  try {
    const response = await fetch(path, init);
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const failure = (body as { error?: unknown } | null)?.error;
      return {
        ok: false,
        failure: typeof failure === 'string' && FAILURES.has(failure) ? (failure as FollowFailure) : 'failed',
      } as const;
    }
    const data = read(body);
    return data === UNREAD ? ({ ok: false, failure: 'failed' } as const) : ({ ok: true, data } as const);
  } catch {
    return { ok: false, failure: 'unavailable' } as const;
  }
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `?package=<name>`, with `&registry=<registry>` only off the default registry, which the route takes by default. */
function channelsQueryOf(pkg: FollowPackage | null): string {
  if (!pkg) return '';
  const params = new URLSearchParams({ package: pkg.name });
  if (pkg.registry !== DEFAULT_REGISTRY) params.set('registry', pkg.registry);
  return `?${params}`;
}

/** The dialog's channels; for one package, its dependents now too; and whether Settings will open here. */
export function fetchFollowChannels(pkg: FollowPackage | null): Promise<FollowCall<FollowChannelsView>> {
  const query = channelsQueryOf(pkg);
  return call(`${FOLLOW_ROUTES.channels}${query}`, undefined, (body) =>
    isRecord(body) && Array.isArray(body.channels)
      ? { ...(body as FollowChannels), settingsLink: body.settingsLink === true }
      : UNREAD,
  );
}

/** The signed-in viewer's follows of these packages. */
export function fetchFollowState(packages: FollowPackage[]): Promise<FollowCall<FollowRow[]>> {
  return call(FOLLOW_ROUTES.state, post({ packages }), (body) =>
    isRecord(body) && Array.isArray(body.follows) ? (body.follows as FollowRow[]) : UNREAD,
  );
}

/** One press of Follow. */
export function postFollowStart(body: FollowStartBody): Promise<FollowCall<FollowStartAnswer>> {
  return call(FOLLOW_ROUTES.start, post(body), (answer) =>
    isRecord(answer) && Array.isArray(answer.results) ? (answer as FollowStartAnswer) : UNREAD,
  );
}

/** A change of one of the viewer's follows; the follow as it now is, or null when it is not theirs. */
export function postFollowChange(body: FollowChangeBody): Promise<FollowCall<FollowRow | null>> {
  return call(FOLLOW_ROUTES.change, post(body), (answer) =>
    isRecord(answer) && 'follow' in answer ? ((answer.follow ?? null) as FollowRow | null) : UNREAD,
  );
}

/** What a press on the signed-in settings page answers: the page, or that the session has ended (`signed-out`). */
export type FollowingPressAnswer = SettingsState | { kind: 'signed-out' };

/**
 * A press on the signed-in settings page: the page as it now is; `signed-out` when the session ended, so only a new
 * sign-in helps; `unavailable` for anything else (the feature closed to the viewer, or following not reached).
 */
export async function postFollowingPress(press: FollowingPress): Promise<FollowingPressAnswer> {
  const answer = await call(FOLLOW_ROUTES.following, post(press), (body) =>
    isRecord(body) && typeof body.kind === 'string' ? (body as SettingsState) : UNREAD,
  );
  if (answer.ok) return answer.data;
  return answer.failure === 'sign_in' ? { kind: 'signed-out' } : { kind: 'unavailable' };
}
