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
      : {
          data: {
            user: { githubLogin: (globalThis as DesignGlobals).__designViewerLogin ?? 'octocat', name: 'Octo Cat' },
          },
          status: 'authenticated',
        },
}));
// The viewer's own daily updates, read in the browser after load: the state's, when it names them.
vi.mock('@/components/daily-updates/use-daily-updates-viewer', () => ({
  useDailyUpdatesViewer: (enabled: boolean) => ({
    viewer: enabled ? ((globalThis as DesignGlobals).__designDailyUpdates ?? null) : null,
    read: enabled ? 'done' : 'idle',
    setViewer: () => {},
    reload: async () => null,
  }),
}));
// "Check my badge", answered in the browser: the state's answer, when it names one.
vi.mock('@/app/badge/builder/[[...login]]/hooks/use-badge-check', () => ({
  useBadgeCheck: () => ({
    result: (globalThis as DesignGlobals).__designBadgeCheck ?? null,
    checking: false,
    check: () => {},
  }),
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
vi.mock('@/lib/workspace/actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/workspace/issue-actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/workspace/start/start-page.actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/contribute/actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/workspace/fair-use.actions', async () => (await import('./inert')).inert());
// Named: the apply page's lookup, send and cancel, never called on a board.
vi.mock('@/app/unsung-heroes/apply/actions', () => ({
  resolveApplyPackage: async () => ({ status: 'NOT_FOUND', packages: [] }),
  sendApplication: async () => ({ ok: false, refusal: 'UNAVAILABLE', application: null }),
  cancelApplication: async () => ({ ok: false, refusal: 'UNAVAILABLE', application: null }),
}));
// Named, with the one a form posts to: a form's action checks the export exists, which `inert()`'s proxy does not answer.
vi.mock('@/lib/learn/actions', async () => ({
  ...Object.fromEntries(
    [
      'startLessonRun',
      'startSharedLessonRun',
      'answerWarmup',
      'markStepShown',
      'answerLessonQuestion',
      'sendQuestionFeedback',
      'reportQuestion',
      'logCopyForAgent',
      'rateLesson',
      'shareMyResult',
      'removeLesson',
      'saveLearnProfile',
      'reactToLessonResult',
      'reactOnReturn',
      'readMyLearnAttempts',
      'readPracticeLessons',
      'readPracticeNext',
      'readLearnIssues',
    ].map((name) => [name, async () => undefined]),
  ),
  signInToReact: async () => {},
}));
vi.mock('@/lib/learn/learn.data', async () => (await import('./inert')).inert());
// Issues' and the masked rows' actions: a board never calls them, and their modules reach the server's sign-in.
vi.mock('@/lib/learn/issues.actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/workspace/masked-issue.actions', async () => (await import('./inert')).inert());
// Named: the sign-in form checks the export exists, which `inert()`'s proxy does not answer.
vi.mock('@/app/(public)/contribute/maintainers/actions', () => ({
  signInAsMaintainer: async () => {},
  optOutMaintainerRepos: async () => {},
  optInMaintainerRepos: async () => {},
  sendPrReport: async () => {},
  sendPrHelped: async () => {},
  undoPrAction: async () => {},
}));
// The badge preview draws itself on the server, as the boards are drawn.
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/contribute.data', async () => (await import('./inert')).inert());
vi.mock('@/lib/contribute/contribute.data', async () => (await import('./inert')).inert());
vi.mock('@/lib/workspace/runs.data', async () => (await import('./inert')).inert());
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
// This week's Unsung hero is asked in the browser by a repository page, to count a view: never on a board.
vi.mock('@/lib/unsung-hero/use-unsung-hero', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/unsung-hero/use-unsung-hero')>()),
  useUnsungHero: () => null,
}));
// A package page's Badges card reads its facts on the server: the fixtures the badge images are drawn from.
vi.mock('@/badge/v3/load', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/badge/v3/load')>();
  const { findBadgeFacts } = await import('./images');
  return {
    ...real,
    loadBadgePackageCard: async (registry: string, name: string) => {
      const facts = findBadgeFacts('package', `${registry}/${name}`);
      return facts?.kind === 'package' ? facts : null;
    },
  };
});
