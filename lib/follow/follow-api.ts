import 'server-only';

import { print } from 'graphql';

import {
  type ApiFollow,
  FollowChangeDocument,
  FollowChannelsDocument,
  FollowPackagesDocument,
  FollowStateDocument,
} from './follow.documents';
import type {
  FollowChangeBody,
  FollowChannel,
  FollowChannels,
  FollowFailure,
  FollowPackage,
  FollowRow,
  FollowStartAnswer,
  FollowStartBody,
  FollowStartResult,
  FollowStatus,
} from './follow.types';
import { signedFetch } from '@/lib/signed-fetch';
import type DocumentNode from '@/types/typed-document-node';

/** Who asks, read by the route from the session and the request, never from the browser's body. */
export type FollowCaller = {
  githubLogin?: string;
  accountEmail?: string;
  /** GitHub marked `accountEmail` verified at the sign-in: only then does the address count as the viewer's own. */
  accountEmailVerified: boolean;
  /** The visitor's network address, for the per-visitor limits on follow requests; never kept. */
  visitorAddress?: string;
};

export type FollowAnswer<T> = { ok: true; data: T } | { ok: false; failure: FollowFailure };

/** The longest a follow call waits for the API. */
const TIMEOUT_MS = 15_000;

type GraphqlError = { message?: unknown; extensions?: { code?: unknown } };
type GraphqlBody = { data?: unknown; errors?: unknown };

const UNKNOWN_FIELD = /Cannot query field|Unknown type|Unknown argument/i;

/** Why the API refused a call, from its errors. */
export function failureOf(errors: GraphqlError[]): FollowFailure {
  const codes = errors.map((error) => error?.extensions?.code);
  if (codes.includes('FOLLOW_UNAVAILABLE')) return 'unavailable';
  if (codes.includes('UNAUTHENTICATED')) return 'sign_in';
  if (errors.some((error) => typeof error?.message === 'string' && UNKNOWN_FIELD.test(error.message))) {
    return 'not_found';
  }
  if (codes.includes('BAD_USER_INPUT') || codes.includes('GRAPHQL_VALIDATION_FAILED')) return 'invalid';
  return 'failed';
}

async function ask<TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables,
  caller: FollowCaller,
): Promise<FollowAnswer<TData>> {
  let response: Response;
  try {
    response = await signedFetch(
      '/graphql',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: print(document), variables }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      'client',
      caller.githubLogin,
      caller.accountEmail,
      caller.accountEmailVerified,
    );
  } catch {
    return { ok: false, failure: 'unavailable' };
  }

  const body = (await response.json().catch(() => null)) as GraphqlBody | null;
  const errors = Array.isArray(body?.errors) ? (body.errors as GraphqlError[]) : [];
  if (errors.length) return { ok: false, failure: failureOf(errors) };
  if (!response.ok || !body?.data) {
    return { ok: false, failure: response.status >= 500 ? 'unavailable' : 'failed' };
  }
  return { ok: true, data: body.data as TData };
}

const lower = <T extends string>(value: string) => value.toLowerCase() as T;

const packageInputOf = ({ name }: FollowPackage) => ({ registry: 'NPM' as const, name });

const rowOf = (follow: ApiFollow): FollowRow => ({
  id: follow.id,
  channel: lower<FollowChannel>(follow.channel),
  package: { registry: follow.package.registry, name: follow.package.name },
  status: lower<FollowStatus>(follow.status),
  events: {
    notable: follow.events.notable,
    digest: follow.events.digest,
    milestones: follow.events.milestones,
  },
});

/** The API answered null: the feature is closed to this request. */
const CLOSED = { ok: false, failure: 'not_found' } as const;

/** The channels the dialog may offer and, for one package, how many repositories use it now. */
export async function readFollowChannels(
  caller: FollowCaller,
  pkg: FollowPackage | null,
): Promise<FollowAnswer<FollowChannels>> {
  const answer = await ask(FollowChannelsDocument, { package: pkg ? packageInputOf(pkg) : null }, caller);
  if (!answer.ok) return answer;
  const read = answer.data.packageFollowChannels;
  if (!read) return CLOSED;
  return {
    ok: true,
    data: {
      channels: read.channels.map((option) => ({ ...option, channel: lower<FollowChannel>(option.channel) })),
      dependents: read.dependents,
      notable: read.notable,
    },
  };
}

/** The signed-in viewer's follows of these packages on every channel; none for a visitor. */
export async function readFollowState(
  caller: FollowCaller,
  packages: FollowPackage[],
): Promise<FollowAnswer<FollowRow[]>> {
  const answer = await ask(FollowStateDocument, { packages: packages.map(packageInputOf) }, caller);
  if (!answer.ok) return answer;
  const follows = answer.data.packageFollow;
  return follows ? { ok: true, data: follows.map(rowOf) } : CLOSED;
}

/** One press of Follow: every package on every channel named. */
export async function startFollow(
  caller: FollowCaller,
  body: FollowStartBody,
): Promise<FollowAnswer<FollowStartAnswer>> {
  const answer = await ask(
    FollowPackagesDocument,
    {
      packages: body.packages.map(packageInputOf),
      events: body.events,
      channels: body.channels.map((channel) => channel.toUpperCase()),
      email: body.email ?? null,
      visitorAddress: caller.visitorAddress ?? null,
    },
    caller,
  );
  if (!answer.ok) return answer;
  const started = answer.data.followPackages;
  if (!started) return CLOSED;
  return {
    ok: true,
    data: {
      refusal: started.refusal ? lower<'unavailable' | 'not_held'>(started.refusal) : null,
      notHeld: started.notHeld.map(({ registry, name }) => ({ registry, name })),
      results: started.results.map((outcome) => ({
        channel: lower<FollowChannel>(outcome.channel),
        package: { registry: outcome.package.registry, name: outcome.package.name },
        result: lower<FollowStartResult>(outcome.result),
        url: outcome.url,
        limit: outcome.limit,
      })),
    },
  };
}

/** A change of one of the signed-in viewer's follows; the follow as it now is, or null when it is not theirs. */
export async function changeFollow(
  caller: FollowCaller,
  body: FollowChangeBody,
): Promise<FollowAnswer<FollowRow | null>> {
  const answer = await ask(
    FollowChangeDocument,
    { followId: body.followId, events: body.events ?? null, remove: body.remove ?? null, undo: body.undo ?? null },
    caller,
  );
  if (!answer.ok) return answer;
  const changed = answer.data.followChange;
  if (!changed) return CLOSED;
  return { ok: true, data: changed.follow ? rowOf(changed.follow) : null };
}
