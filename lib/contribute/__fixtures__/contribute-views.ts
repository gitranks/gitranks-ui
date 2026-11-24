import type {
  ContributeCredential,
  ContributeEmailSettings,
  ContributeGrant,
  ContributeLimits,
  ContributeMcpToken,
  ContributeSettings,
  ContributeSpend,
  ContributeView,
  Contributor,
} from '@/lib/workspace/contribute.types';

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
  hostedLevel: 'MANUAL',
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

/**
 * The limits at each access level: a new account's, after claims ran out, and suspended (nothing new starts); and at
 * the standard level with an open pull request limit set for the account, over the setting.
 */
export const limits = {
  standard: {
    level: 'STANDARD',
    reason: null,
    attemptsAtATime: 3,
    openPrsAtATime: 10,
    claimsPerDay: 10,
  },
  suspended: {
    level: 'SUSPENDED',
    reason: null,
    attemptsAtATime: 1,
    openPrsAtATime: 2,
    claimsPerDay: 0,
  },
  openPrsSet: {
    level: 'STANDARD',
    reason: null,
    attemptsAtATime: 3,
    openPrsAtATime: 10,
    openPrsEffective: 16,
    openPrsOverride: 16,
    claimsPerDay: 10,
  },
} satisfies Record<string, ContributeLimits>;

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
/** The Email rows of Settings: the defaults, a summary a day, all off, and no address. */
export const email = {
  on: { to: 'o•••@example.com', needsYou: 'AFTER_30_MINUTES', ended: true, timeZone: 'Europe/Warsaw' },
  daily: { to: 'o•••@example.com', needsYou: 'ONCE_A_DAY', ended: true, timeZone: 'Europe/Warsaw' },
  off: { to: 'o•••@example.com', needsYou: 'OFF', ended: false, timeZone: null },
  noAddress: { to: null, needsYou: 'AFTER_30_MINUTES', ended: true, timeZone: null },
} satisfies Record<string, ContributeEmailSettings>;

export const views = {
  newcomer: { contributor: null, grant: { connected: false, login: null }, grantAvailable: true },
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
    grantAvailable: true,
    ownAgent: { paths: { hosted: false, mcp: true }, tokens: [mcpToken()] },
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
    grantAvailable: true,
    ownAgent: {
      paths: { hosted: false, mcp: true },
      tokens: [mcpToken({ lastUsedAt: '2026-10-28T11:05:00.000Z' })],
    },
  },
  /** Onboarded once, and since then the key removed and the tokens revoked. */
  onboardedNoPath: {
    contributor: contributor({ credentials: [], settings: null, spend: null }),
    grant: connected,
    grantAvailable: true,
    ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] },
  },
  active: { contributor: contributor(), grant: connected, grantAvailable: true },
  /**
   * A key just connected from Max: onboarded, every setting guessed, nothing spent, the first attempt free to start,
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
    grantAvailable: true,
  },
  keyInvalid: {
    contributor: contributor({ credentials: [key({ state: 'INVALID' })] }),
    grant: connected,
    grantAvailable: true,
  },
  exhausted: {
    contributor: contributor({ credentials: [key({ state: 'EXHAUSTED', blockedUntil: '2026-11-14T00:00:00.000Z' })] }),
    grant: connected,
    grantAvailable: true,
  },
  limitReached: {
    contributor: contributor({
      credentials: [key({ state: 'LIMIT_REACHED', blockedUntil: '2026-11-01T00:00:00.000Z' })],
    }),
    grant: connected,
    grantAvailable: true,
  },
  grantMissing: {
    contributor: contributor(),
    grant: { connected: false, login: null },
    grantAvailable: true,
  },
  /** Paused, as a refused key leaves the account: the key's notice says it. */
  paused: {
    contributor: contributor({ status: 'PAUSED', credentials: [key({ state: 'INVALID' })] }),
    grant: connected,
    grantAvailable: true,
  },
  /** Paused by the owner: nothing new starts. */
  suspended: {
    contributor: contributor({ limits: limits.suspended }),
    grant: connected,
    grantAvailable: true,
  },
  /** An API that does not answer the grant and the pause yet. */
  fieldsMissing: { contributor: contributor(), grant: undefined, grantAvailable: true },
  /** An API that does not answer the onboarding yet: the fields are left out. */
  onboardingMissing: {
    contributor: (({ onboardedAt: _at, onboardedVia: _via, ...rest }) => rest)(contributor()),
    grant: connected,
    grantAvailable: true,
  },
  autopilotUnlocked: {
    contributor: contributor({
      autopilot: {
        unlocked: true,
        mergedCount: 6,
        closedUnmergedStreak: 0,
        mergedToUnlock: 0,
        lockedAt: null,
        available: true,
      },
      settings: { ...settings, hostedLevel: 'AUTOPILOT' },
    }),
    grant: connected,
    grantAvailable: true,
  },
  /** Autopilot is not open yet: the record is read, the setting cannot be turned on. */
  autopilotComing: {
    contributor: contributor({
      autopilot: {
        unlocked: false,
        mergedCount: 4,
        closedUnmergedStreak: 1,
        mergedToUnlock: 1,
        lockedAt: null,
        available: false,
      },
    }),
    grant: connected,
    grantAvailable: true,
  },
  /** Locked again by two pull requests closed without merging: five merged since then unlock it. */
  autopilotRelocked: {
    contributor: contributor({
      autopilot: {
        unlocked: false,
        mergedCount: 6,
        closedUnmergedStreak: 0,
        mergedToUnlock: 4,
        lockedAt: '2026-10-20T08:00:00.000Z',
        available: true,
      },
    }),
    grant: connected,
    grantAvailable: true,
  },
} satisfies Record<string, ContributeView>;

/** The own agent connected: a token its agent called with an hour ago. */
const ownAgentConnected = {
  paths: { hosted: true, mcp: true },
  tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })],
};

/** The Agent tab's people (W1 §9.4): both agents, the own agent alone, the hosted one alone, a learner. */
export const agentTabViews = {
  both: { ...views.active, ownAgent: ownAgentConnected, sides: { contribute: true, learn: true } },
  ownOnly: {
    ...views.agentOnboarded,
    contributor: contributor({ credentials: [], plan: null, settings: null, spend: null, onboardedVia: 'MCP' }),
    ownAgent: { ...ownAgentConnected, paths: { hosted: false, mcp: true } },
    sides: { contribute: true, learn: false },
  },
  hostedOnly: {
    ...views.active,
    ownAgent: { paths: { hosted: true, mcp: false }, tokens: [] },
    sides: { contribute: true, learn: false },
  },
  learner: {
    ...views.agentOnboarded,
    ownAgent: { ...ownAgentConnected, paths: { hosted: false, mcp: true } },
    sides: { contribute: false, learn: true },
  },
  keyInvalid: { ...views.keyInvalid, ownAgent: ownAgentConnected, sides: { contribute: true, learn: true } },
  /** Entered once, then the key and the last connection were removed: nothing connected now. */
  nothing: {
    ...views.agentOnboarded,
    contributor: contributor({ credentials: [], plan: null, settings: null, spend: null, onboardedVia: 'MCP' }),
    ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] },
    sides: { contribute: true, learn: true },
  },
  /** Not entered yet (preferences saved, no agent), opening the Agent tab by its address. */
  notEntered: { ...views.noKey, ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] } },
} satisfies Record<string, ContributeView>;

/** The Settings tab's people (W1 §10.3): using both sides, a contributor, a learner (own agent, settings stored). */
export const settingsViews = {
  both: { ...views.active, sides: { contribute: true, learn: true } },
  contributor: { ...views.active, sides: { contribute: true, learn: false } },
  learner: {
    ...views.agentOnboarded,
    contributor: contributor({ credentials: [], plan: null, spend: null, onboardedVia: 'MCP' }),
    sides: { contribute: false, learn: true },
  },
} satisfies Record<string, ContributeView>;
