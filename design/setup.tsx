import { vi } from 'vitest';

// Screens render as the server would send them: no router, a signed-in look, loaders and actions never called.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => (globalThis as { __designPath?: string }).__designPath ?? '/',
  useSearchParams: () => new URLSearchParams((globalThis as { __designSearch?: string }).__designSearch ?? ''),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('next-auth/react', () => ({
  signIn: () => {},
  signOut: () => {},
  useSession: () => ({ data: { user: { githubLogin: 'octocat', name: 'Octo Cat' } }, status: 'authenticated' }),
}));
vi.mock('@/lib/contribute/use-contribute-allowed', () => ({ useContributeAllowed: () => true }));
vi.mock('@/components/signin-button/signin-button', () => ({
  default: () => <span aria-hidden="true" className="block size-8 rounded-full border bg-muted" />,
}));
vi.mock('@/app/contribute/actions', async () => (await import('./inert')).inert());
vi.mock('@/app/contribute/runs/actions', async () => (await import('./inert')).inert());
vi.mock('@/lib/contribute/contribute.data', async () => (await import('./inert')).inert());
vi.mock('@/lib/contribute/runs.data', async () => (await import('./inert')).inert());
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));
