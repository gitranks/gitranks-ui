import type {
  ContributeSet,
  ContributeSetRepo,
  ContributeStackResolve,
  ContributeStackTarget,
} from '../contribute.types';

export const setRepo = (patch: Partial<ContributeSetRepo> = {}): ContributeSetRepo => ({
  repositoryId: `R_${patch.nameWithOwner ?? 'octocat/hello'}`,
  nameWithOwner: 'octocat/hello',
  stars: 1300,
  language: 'JS_TS',
  via: { kind: 'ME', login: null },
  addedAt: '2026-10-20T09:00:00.000Z',
  status: 'ACTIVE',
  reasons: [],
  ...patch,
});

export const target = (patch: Partial<ContributeStackTarget> = {}): ContributeStackTarget => ({
  ...setRepo({ via: { kind: 'REPO', login: null } }),
  usage: 1,
  packages: [],
  ...patch,
  repositoryId: `T_${patch.nameWithOwner ?? 'octocat/lib'}`,
});

const LIMITS: ContributeSet['limits'] = {
  sources: 50,
  repos: 50,
  targets: 50,
  ignore: 50,
  addsPerDay: 60,
  resolvesPerDay: 10,
  feedbackPerDay: 10,
  feedbackMaxChars: 2000,
};

/** Fifty libraries, most used first, then two in a language not supported yet. */
const targets: ContributeStackTarget[] = [
  target({
    nameWithOwner: 'facebook/react',
    usage: 12,
    stars: 236000,
    packages: ['react', 'react-dom', 'scheduler'],
  }),
  target({ nameWithOwner: 'microsoft/TypeScript', usage: 12, stars: 104000, packages: ['typescript'] }),
  target({
    nameWithOwner: 'nestjs/nest',
    usage: 8,
    stars: 70000,
    packages: ['@nestjs/core', '@nestjs/common', '@nestjs/config', '@nestjs/testing', '@nestjs/swagger'],
    status: 'CHECKING',
  }),
  ...Array.from({ length: 47 }, (_, index) =>
    target({ nameWithOwner: `lib-${index}/lib-${index}`, usage: 2, stars: 900 - index, packages: [`lib-${index}`] }),
  ),
  target({ nameWithOwner: 'JetBrains/kotlin', usage: 3, stars: 50000, language: null, status: 'UNSUPPORTED' }),
  target({ nameWithOwner: 'google/guava', usage: 2, stars: 50000, language: null, status: 'UNSUPPORTED' }),
];

export const resolve = (patch: Partial<ContributeStackResolve> = {}): ContributeStackResolve => ({
  state: 'READY',
  startedAt: '2026-10-28T11:55:00.000Z',
  endedAt: '2026-10-28T11:56:00.000Z',
  targets,
  failed: [
    { repositoryId: 'F_1', nameWithOwner: 'lodash/lodash', usage: 7, reasons: ['OUTSIDE_MERGES'] },
    { repositoryId: 'F_2', nameWithOwner: 'moment/moment', usage: 3, reasons: ['ARCHIVED'] },
  ],
  unlinked: 38,
  packages: 412,
  ...patch,
});

const sources: ContributeSetRepo[] = [
  setRepo({ nameWithOwner: 'octocat/resize-detector', stars: 1300 }),
  setRepo({ nameWithOwner: 'octocat/site', stars: 12, status: 'CHECKING' }),
  setRepo({
    nameWithOwner: 'acme-corp/web',
    stars: 220,
    via: { kind: 'OWNER', login: 'acme-corp' },
    addedAt: '2026-10-27T09:00:00.000Z',
  }),
];

/** Support my stack: three sources, fifty libraries, waiting on nothing. */
export const stackSet = (patch: Partial<ContributeSet> = {}): ContributeSet => ({
  mode: 'STACK',
  stack: { sources, count: sources.length, fallback: 'THEN_ALL', resolve: resolve() },
  repos: { repos: [], count: 0, fallback: 'THEN_ALL' },
  ignore: [
    { repositoryId: 'I_1', nameWithOwner: 'eslint/eslint', at: '2026-10-20T09:00:00.000Z' },
    { repositoryId: 'I_2', nameWithOwner: 'prettier/prettier', at: '2026-10-20T09:00:00.000Z' },
    { repositoryId: 'I_3', nameWithOwner: 'acme-corp/legacy', at: '2026-10-20T09:00:00.000Z' },
  ],
  version: 4,
  limits: LIMITS,
  ...patch,
});

/** Fifty repos: two from vercel just now, a failed and many from nodejs, a greyed one added on its own. */
const fullRepos: ContributeSetRepo[] = [
  setRepo({
    nameWithOwner: 'vercel/next.js',
    stars: 131000,
    via: { kind: 'OWNER', login: 'vercel' },
    addedAt: '2026-10-28T11:59:00.000Z',
  }),
  setRepo({
    nameWithOwner: 'vercel/swr',
    stars: 31000,
    via: { kind: 'OWNER', login: 'vercel' },
    addedAt: '2026-10-28T11:59:00.000Z',
    status: 'CHECKING',
  }),
  setRepo({
    nameWithOwner: 'nodejs/undici',
    stars: 6500,
    via: { kind: 'OWNER', login: 'nodejs' },
    addedAt: '2026-10-26T09:00:00.000Z',
    status: 'FAILED',
    reasons: ['OPTED_OUT'],
  }),
  ...Array.from({ length: 48 }, (_, index) =>
    setRepo({
      nameWithOwner: `nodejs/repo-${index}`,
      stars: 5000 - index,
      via: { kind: 'OWNER', login: 'nodejs' },
      addedAt: '2026-10-26T09:00:00.000Z',
    }),
  ),
  setRepo({
    nameWithOwner: 'JetBrains/kotlin',
    stars: 50000,
    language: null,
    via: { kind: 'REPO', login: null },
    status: 'UNSUPPORTED',
    reasons: ['LANGUAGE'],
  }),
];

/** Support these repos: the list full at 50, only these. */
export const fullReposSet = (patch: Partial<ContributeSet> = {}): ContributeSet =>
  stackSet({
    mode: 'REPOS',
    repos: { repos: fullRepos, count: 50, fallback: 'SET_ONLY' },
    ...patch,
  });

/** Support these repos: twelve repos, three still read for the first time, only these. */
export const smallReposSet = (patch: Partial<ContributeSet> = {}): ContributeSet => {
  const repos = Array.from({ length: 12 }, (_, index) =>
    setRepo({
      nameWithOwner: `acme/repo-${index}`,
      via: { kind: 'OWNER', login: 'acme' },
      status: index < 3 ? 'CHECKING' : 'ACTIVE',
      language: index < 4 ? 'GO' : 'JS_TS',
    }),
  );
  return stackSet({ mode: 'REPOS', repos: { repos, count: 12, fallback: 'SET_ONLY' }, ...patch });
};
