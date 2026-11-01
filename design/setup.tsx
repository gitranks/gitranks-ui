import type { ReactNode } from 'react';
import { vi } from 'vitest';

import type { DesignGlobals } from './registry';

// Screens render as the server would send them: no router, a signed-in look unless a state is signed out, loaders and
// actions never called.

// One clock for every board, so an export draws the same "3 days ago" each time: the day the fixtures are set on.
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-28T12:00:00.000Z') });

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => (globalThis as DesignGlobals).__designPath ?? '/',
  useParams: () => (globalThis as DesignGlobals).__designParams ?? {},
  useSearchParams: () => new URLSearchParams((globalThis as DesignGlobals).__designSearch ?? ''),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
// A component loaded in the browser alone (`ssr: false`) is its loading placeholder in the server's HTML, or nothing.
vi.mock('next/dynamic', () => ({
  default: (_load: unknown, options?: { loading?: () => ReactNode }) => options?.loading ?? (() => null),
}));
vi.mock('next-auth/react', () => ({
  signIn: () => {},
  signOut: () => {},
  useSession: () =>
    (globalThis as DesignGlobals).__designSignedOut
      ? { data: null, status: 'unauthenticated' }
      : { data: { user: { githubLogin: 'octocat', name: 'Octo Cat' } }, status: 'authenticated' },
}));
// Contribute is open to the signed-in viewer; a visitor who is not signed in is never asked about.
vi.mock('@/lib/contribute/use-contribute-allowed', () => ({
  useContributeAllowed: (login?: string | null) => !!login,
}));
// The landing's own rank card, read in the browser: the viewer's from the fixtures.
vi.mock('@/app/components/landing/use-rank-card', async () => {
  const { viewerRankCard } = await import('@/app/components/landing/__fixtures__/landing');
  return { useRankCard: () => ({ card: viewerRankCard, state: 'ready' }) };
});
// Signed in, the viewer's avatar; signed out, the real button.
vi.mock('@/components/signin-button/signin-button', async (importOriginal) => {
  const { default: SigninButton } = await importOriginal<typeof import('@/components/signin-button/signin-button')>();
  return {
    default: () =>
      (globalThis as DesignGlobals).__designSignedOut ? (
        <SigninButton />
      ) : (
        <span aria-hidden="true" className="block size-8 rounded-full border bg-muted" />
      ),
  };
});
// The API, from the server and from the browser: screens get their data from fixtures and never read it.
vi.mock('@/lib/graphql/graphql-direct', async () => (await import('./inert')).inert());
vi.mock('@/lib/graphql/graphql-client', async () => (await import('./inert')).inert());
vi.mock('@/graphql/helpers/fetch-countries', async () => {
  const { countries } = await import('@/components/ranking-table/__fixtures__/global-rankings');
  return { fetchCountries: async () => countries };
});
vi.mock('@/app/contribute/actions', async () => (await import('./inert')).inert());
vi.mock('@/app/contribute/runs/actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/contribute/contribute.data', async () => (await import('./inert')).inert());
vi.mock('@/lib/contribute/runs.data', async () => (await import('./inert')).inert());
vi.mock('@/components/navigation-progress/navigation-progress', () => ({
  useReportPendingNavigation: () => {},
  LinkPendingStatus: () => null,
}));
// The builder's loader: the facts of the entity its URL names, from the fixtures the badge images are drawn from.
vi.mock('@/app/badge/builder/[[...login]]/hooks/use-entity-facts', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/app/badge/builder/[[...login]]/hooks/use-entity-facts')>();
  const { findBadgeFacts } = await import('./images');
  return {
    ...real,
    useEntityFacts: (kind: Parameters<typeof findBadgeFacts>[0] | null, name: string | null) => {
      const facts = kind && name ? findBadgeFacts(kind, name) : null;
      return !kind || !name ? { status: 'idle' } : facts ? { status: 'found', facts } : { status: 'missing' };
    },
  };
});
// Badges draw avatars from the fixtures alone: a grey disk, never a fetch.
vi.mock('@/badge/v3/avatars', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/badge/v3/avatars')>()),
  fetchAvatar: async () => null,
  fetchAvatars: async (urls: unknown[]) => urls.map(() => null),
}));
