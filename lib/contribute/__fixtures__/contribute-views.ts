import type {
  ContributeCredential,
  ContributeGrant,
  ContributeMcpToken,
  ContributeSettings,
  ContributeSpend,
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
  onboardedAt: '2026-10-14T09:00:00.000Z',
  onboardedVia: 'HOSTED',
  ...patch,
});

/** The spend of a key just connected: nothing spent, the first attempt free to start. */
export const firstSpend: ContributeSpend = {
  todayUsd: 0,
  weekUsd: 0,
  cycleUsd: 0,
  cycleStart: '2026-10-28T00:00:00.000Z',
  cycleEnd: '2026-11-28T00:00:00.000Z',
  allowanceUsd: 5,
  nextAttemptAt: '2026-10-28T11:59:00.000Z',
};

/** A token for the user's own agent, created and not used yet. */
export const mcpToken = (patch: Partial<ContributeMcpToken> = {}): ContributeMcpToken => ({
  id: 'T_1',
  name: 'Claude Code on macOS',
  last4: 'Qx9z',
  createdAt: '2026-10-28T11:00:00.000Z',
  lastUsedAt: null,
  ...patch,
});

/** The onboarding fields of a contributor not onboarded yet. */
const notOnboarded = { onboardedAt: null, onboardedVia: null } as const;

const connected: ContributeGrant = { connected: true, login: 'octocat' };

/** One view for each state a Contribute page renders. */
export const views = {
  newcomer: { contributor: null, grant: { connected: false, login: null }, paused: false, grantAvailable: true },
  noKey: {
    contributor: contributor({
      credentials: [],
      settings: null,
      spend: null,
      step: 'KEY',
      status: 'ONBOARDING',
      ...notOnboarded,
    }),
    grant: { connected: false, login: null },
    paused: false,
    grantAvailable: true,
  },
  /** A token for their own agent is live, and the agent has not called yet: setup, not onboarding. */
  midSetup: {
    contributor: contributor({
      credentials: [],
      plan: null,
      settings: null,
      spend: null,
      step: 'KEY',
      status: 'ONBOARDING',
      ...notOnboarded,
    }),
    grant: { connected: false, login: null },
    paused: false,
    grantAvailable: true,
    ownAgent: { paths: { hosted: false, mcp: true }, tokens: [mcpToken()] },
    attemptsOpen: true,
  },
  /** Onboarded by their own agent's first call: a used token, no Claude key. */
  agentOnboarded: {
    contributor: contributor({
      credentials: [],
      plan: null,
      settings: null,
      spend: null,
      step: 'KEY',
      onboardedVia: 'MCP',
    }),
    grant: { connected: false, login: null },
    paused: false,
    grantAvailable: true,
    ownAgent: {
      paths: { hosted: false, mcp: true },
      tokens: [mcpToken({ lastUsedAt: '2026-10-28T11:05:00.000Z' })],
    },
    attemptsOpen: true,
  },
  /** Onboarded once, and since then the key removed and the tokens revoked. */
  onboardedNoPath: {
    contributor: contributor({ credentials: [], settings: null, spend: null }),
    grant: connected,
    paused: false,
    grantAvailable: true,
    ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] },
  },
  active: { contributor: contributor(), grant: connected, paused: false, grantAvailable: true, attemptsOpen: true },
  /**
   * A key just connected from Max 5x: onboarded, every setting guessed, nothing spent, the first attempt free to start,
   * and no GitHub access yet.
   */
  firstKey: {
    contributor: contributor({
      plan: 'MAX_5X',
      settings: { ...settings, cycleCapUsd: 100, dayCapUsd: null, renewalDay: 28 },
      preferences: null,
      spend: firstSpend,
      onboardedAt: '2026-10-28T11:58:00.000Z',
    }),
    grant: { connected: false, login: null },
    paused: false,
    grantAvailable: true,
    attemptsOpen: true,
  },
  keyInvalid: {
    contributor: contributor({ credentials: [key({ state: 'INVALID' })] }),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
  exhausted: {
    contributor: contributor({ credentials: [key({ state: 'EXHAUSTED', blockedUntil: '2026-11-14T00:00:00.000Z' })] }),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
  limitReached: {
    contributor: contributor({
      credentials: [key({ state: 'LIMIT_REACHED', blockedUntil: '2026-11-01T00:00:00.000Z' })],
    }),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
  grantMissing: {
    contributor: contributor(),
    grant: { connected: false, login: null },
    paused: false,
    grantAvailable: true,
  },
  paused: { contributor: contributor({ status: 'PAUSED' }), grant: connected, paused: true, grantAvailable: true },
  /** An API that does not answer the grant and the pause yet. */
  fieldsMissing: { contributor: contributor(), grant: undefined, paused: undefined, grantAvailable: true },
  /** An API that does not answer the onboarding yet: the fields are left out. */
  onboardingMissing: {
    contributor: (({ onboardedAt: _at, onboardedVia: _via, ...rest }) => rest)(contributor()),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
  autopilotUnlocked: {
    contributor: contributor({
      autopilot: {
        unlocked: true,
        mergedCount: 4,
        closedUnmergedStreak: 0,
        mergedToUnlock: 0,
        lockedAt: null,
        available: true,
      },
      settings: { ...settings, autopilot: true },
    }),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
  /** Autopilot is not open yet: the record is read, the setting cannot be turned on. */
  autopilotComing: {
    contributor: contributor({
      autopilot: {
        unlocked: false,
        mergedCount: 2,
        closedUnmergedStreak: 1,
        mergedToUnlock: 1,
        lockedAt: null,
        available: false,
      },
    }),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
  /** Locked again by two pull requests closed without merging: three merged since then unlock it. */
  autopilotRelocked: {
    contributor: contributor({
      autopilot: {
        unlocked: false,
        mergedCount: 5,
        closedUnmergedStreak: 0,
        mergedToUnlock: 2,
        lockedAt: '2026-10-20T08:00:00.000Z',
        available: true,
      },
    }),
    grant: connected,
    paused: false,
    grantAvailable: true,
  },
} satisfies Record<string, ContributeView>;
