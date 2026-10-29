import type {
  ContributeCredential,
  ContributeGrant,
  ContributeSettings,
  ContributeView,
  Contributor,
} from '../contribute.types';

export const NOW = new Date('2026-10-28T12:00:00.000Z');

export const settings: ContributeSettings = {
  cycleCapUsd: 200,
  weekCapUsd: null,
  dayCapUsd: 15,
  attemptCapUsd: 5,
  attemptsAtATime: 1,
  pace: 'EVEN',
  sweepDays: 3,
  renewalDay: 14,
  mainModel: 'CLAUDE_SONNET_5_5',
  helperModel: 'CLAUDE_HAIKU_5_5',
  testModel: null,
  effort: 'MEDIUM',
  maxChangedLines: 400,
  maxFiles: 15,
  openPrsAtATime: 3,
  dco: 'ASK',
  autopilot: false,
};

export const key = (patch: Partial<ContributeCredential> = {}): ContributeCredential => ({
  provider: 'ANTHROPIC',
  last4: 'k3Qa',
  orgId: 'org_01',
  workspaceId: 'wrkspc_01JABCDEFGH7HKf',
  state: 'VALID',
  blockedUntil: null,
  ready: true,
  checkedAt: '2026-10-28T10:00:00.000Z',
  lastError: null,
  ...patch,
});

export const contributor = (patch: Partial<Contributor> = {}): Contributor => ({
  status: 'ACTIVE',
  login: 'octocat',
  plan: 'MAX_20X',
  step: 'DONE',
  credentials: [key()],
  settings,
  preferences: {
    languages: ['RUST'],
    topicIds: ['T_1', 'T_2'],
    reposIn: [],
    reposOut: ['R_1'],
    kinds: ['BUG'],
    maxSize: null,
  },
  spend: {
    todayUsd: 3.2,
    weekUsd: 20,
    cycleUsd: 63.4,
    cycleStart: '2026-10-14T00:00:00.000Z',
    cycleEnd: '2026-11-14T00:00:00.000Z',
    allowanceUsd: 12,
    nextAttemptAt: '2026-10-28T14:00:00.000Z',
  },
  autopilot: { unlocked: false, mergedCount: 1, closedUnmergedStreak: 0 },
  ...patch,
});

const connected: ContributeGrant = { connected: true, login: 'octocat' };

/** One view for each state a Contribute page renders. */
export const views = {
  newcomer: { contributor: null, grant: { connected: false, login: null }, paused: false },
  noKey: {
    contributor: contributor({ credentials: [], settings: null, spend: null, step: 'KEY', status: 'ONBOARDING' }),
    grant: { connected: false, login: null },
    paused: false,
  },
  active: { contributor: contributor(), grant: connected, paused: false },
  keyInvalid: {
    contributor: contributor({ credentials: [key({ state: 'INVALID' })] }),
    grant: connected,
    paused: false,
  },
  exhausted: {
    contributor: contributor({ credentials: [key({ state: 'EXHAUSTED', blockedUntil: '2026-11-14T00:00:00.000Z' })] }),
    grant: connected,
    paused: false,
  },
  limitReached: {
    contributor: contributor({
      credentials: [key({ state: 'LIMIT_REACHED', blockedUntil: '2026-11-01T00:00:00.000Z' })],
    }),
    grant: connected,
    paused: false,
  },
  grantMissing: { contributor: contributor(), grant: { connected: false, login: null }, paused: false },
  paused: { contributor: contributor({ status: 'PAUSED' }), grant: connected, paused: true },
  /** An API that does not answer the grant and the pause yet. */
  fieldsMissing: { contributor: contributor(), grant: undefined, paused: undefined },
  autopilotUnlocked: {
    contributor: contributor({
      autopilot: { unlocked: true, mergedCount: 4, closedUnmergedStreak: 0 },
      settings: { ...settings, autopilot: true },
    }),
    grant: connected,
    paused: false,
  },
} satisfies Record<string, ContributeView>;
