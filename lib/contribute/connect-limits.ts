import type {
  ContributeClaudePlan,
  ContributeConnectLimits,
  ContributeConnectPace,
  ContributeModel,
  ContributePace,
  ContributePreferences,
  ContributeSettings,
} from './contribute.types';
import { KINDS, LANGUAGES, MODELS, ordinalDay, parseAmount, planOf, SIZES, usd } from './format';

/**
 * What a first key starts from, as the API sets it: the connect sends only what the user changed, so these describe
 * the limits on the screen and are never sent as such.
 */
export const CONNECT_DEFAULTS = {
  /** "I'll set them myself" starts the month here. */
  manualCycleCapUsd: 50,
  weekCapUsd: null,
  dayCapUsd: null,
  attemptCapUsd: 5,
  attemptsAtATime: 1,
  pace: 'EVEN',
  mainModel: 'CLAUDE_SONNET_5_5',
  helperModel: 'CLAUDE_HAIKU_5_5',
  maxChangedLines: 400,
  maxFiles: 15,
  openPrsAtATime: 3,
} as const satisfies {
  manualCycleCapUsd: number;
  weekCapUsd: number | null;
  dayCapUsd: number | null;
  attemptCapUsd: number;
  attemptsAtATime: number;
  pace: ContributeConnectPace;
  mainModel: ContributeModel;
  helperModel: ContributeModel;
  maxChangedLines: number;
  maxFiles: number;
  openPrsAtATime: number;
};

/** The bounds the API holds each amount to, inclusive. */
export const CONNECT_BOUNDS = {
  capUsd: { min: 1, max: 5_000 },
  attemptCapUsd: { min: 0.5, max: 100 },
} as const;

/** The plans "From my Claude plan" offers, by name alone: the buttons show no prices, so none reads as ours. */
export const PLAN_CHOICES: { plan: ContributeClaudePlan; label: string }[] = [
  { plan: 'MAX_5X', label: 'Max 5x' },
  { plan: 'MAX_20X', label: 'Max 20x' },
  { plan: 'TEAM_STANDARD', label: 'Team Standard' },
  { plan: 'TEAM_PREMIUM', label: 'Team Premium' },
];

/** How the limits are set: from the plan's monthly allowance, or by hand. */
export type LimitsMode = 'plan' | 'manual';

/**
 * "I'll set them myself" as typed: amounts as text, the pace picked. `QUEUED` only ever comes from the stored settings
 * (the screen offers the other two): it is kept until the user picks one.
 */
export type ManualLimitsDraft = {
  month: string;
  week: string;
  day: string;
  attempt: string;
  pace: ContributePace;
};

export type ManualField = 'month' | 'week' | 'day' | 'attempt';

export const manualDraftOf = (patch: Partial<ManualLimitsDraft> = {}): ManualLimitsDraft => ({
  month: String(CONNECT_DEFAULTS.manualCycleCapUsd),
  week: '',
  day: '',
  attempt: String(CONNECT_DEFAULTS.attemptCapUsd),
  pace: CONNECT_DEFAULTS.pace,
  ...patch,
});

/** The hand-set limits once they hold, the pace as the draft has it. */
export type ManualLimitsSet = {
  weekCapUsd: number | null;
  dayCapUsd: number | null;
  attemptCapUsd: number;
  pace: ContributePace;
};

export type ManualLimits =
  | { ok: true; cycleCapUsd: number; limits: ManualLimitsSet }
  | { ok: false; field: ManualField; message: string };

const LABELS: Record<ManualField, string> = {
  month: 'each month',
  week: 'each week',
  day: 'each day',
  attempt: 'each attempt',
};

const twoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;

type Refusal = Extract<ManualLimits, { ok: false }>;

/** One amount as typed: a number, null when left empty (only a week or day cap may be), or why it is refused. */
function amountOf(draft: ManualLimitsDraft, field: ManualField): number | null | Refusal {
  const value = parseAmount(draft[field]);
  const bounds = field === 'attempt' ? CONNECT_BOUNDS.attemptCapUsd : CONNECT_BOUNDS.capUsd;
  const label = LABELS[field].replace(/^e/, 'E');
  if (value === null) {
    if (field === 'week' || field === 'day') return null;
    return {
      ok: false,
      field,
      message: field === 'month' ? 'Set a monthly amount to continue.' : `Set ${LABELS[field]}.`,
    };
  }
  if (value === undefined || value < bounds.min || value > bounds.max) {
    return { ok: false, field, message: `${label} is between ${usd(bounds.min)} and ${usd(bounds.max)}.` };
  }
  if (!twoDecimals(value)) return { ok: false, field, message: `${label} takes at most two decimals.` };
  return value;
}

const isRefusal = (value: number | null | Refusal): value is Refusal => typeof value === 'object' && value !== null;

/**
 * The limits the user set, checked as the API checks them: each amount in its bounds with at most two decimals, the
 * month required, the week and day empty for none, and the attempt cap not above any cap that is set (no attempt
 * could start under it, so the connect would refuse it).
 */
export function manualLimitsOf(draft: ManualLimitsDraft): ManualLimits {
  const month = amountOf(draft, 'month');
  if (isRefusal(month)) return month;
  const week = amountOf(draft, 'week');
  if (isRefusal(week)) return week;
  const day = amountOf(draft, 'day');
  if (isRefusal(day)) return day;
  const attempt = amountOf(draft, 'attempt');
  if (isRefusal(attempt)) return attempt;
  if (month === null || attempt === null)
    return { ok: false, field: 'month', message: 'Set a monthly amount to continue.' };

  const caps: [ManualField, number][] = [['month', month]];
  if (week !== null) caps.push(['week', week]);
  if (day !== null) caps.push(['day', day]);
  const [smallestField, smallest] = caps.reduce((low, cap) => (cap[1] < low[1] ? cap : low));
  if (attempt > smallest) {
    return {
      ok: false,
      field: 'attempt',
      message: `Each attempt can't be more than ${LABELS[smallestField]} (${usd(smallest)}): no attempt could start.`,
    };
  }

  return {
    ok: true,
    cycleCapUsd: month,
    limits: { weekCapUsd: week, dayCapUsd: day, attemptCapUsd: attempt, pace: draft.pace },
  };
}

const PACE_TEXT: Record<ContributePace, string> = {
  EVEN: 'spread across your month',
  FAST: 'as fast as those caps allow',
  QUEUED: 'only on issues you queue',
};

const isConnectPace = (pace: ContributePace): pace is ContributeConnectPace => pace === 'EVEN' || pace === 'FAST';

/**
 * The stored settings as "I'll set them myself" starts from them, for a key connected before: the amounts as they are,
 * and the pace, `QUEUED` included, so a replace never shows (or sends) a pace the user did not pick.
 */
export function manualDraftFromSettings(settings: ContributeSettings): Partial<ManualLimitsDraft> {
  const amount = (value: number | null) => (value === null ? '' : String(value));
  return {
    month: amount(settings.cycleCapUsd),
    week: amount(settings.weekCapUsd),
    day: amount(settings.dayCapUsd),
    attempt: amount(settings.attemptCapUsd),
    pace: settings.pace,
  };
}

/**
 * The `limits` a connect sends from the hand-set ones: on a key connected before, only the fields that differ from the
 * stored settings (the API keeps the rest); on a first one, all of them. The pace goes only when it is one the connect
 * takes, so a `QUEUED` pace the user left alone stays `QUEUED`.
 */
export function connectLimitsOf(set: ManualLimitsSet, stored: ContributeSettings | null): ContributeConnectLimits {
  const changed = <K extends keyof ManualLimitsSet>(field: K) => !stored || stored[field] !== set[field];
  return {
    ...(changed('weekCapUsd') ? { weekCapUsd: set.weekCapUsd } : {}),
    ...(changed('dayCapUsd') ? { dayCapUsd: set.dayCapUsd } : {}),
    ...(changed('attemptCapUsd') ? { attemptCapUsd: set.attemptCapUsd } : {}),
    ...(changed('pace') && isConnectPace(set.pace) ? { pace: set.pace } : {}),
  };
}

/** The live line under the manual limits: what they add up to, or what is still missing. */
export function manualSummaryOf(draft: ManualLimitsDraft): string {
  const result = manualLimitsOf(draft);
  if (!result.ok) return result.message;
  const { weekCapUsd, dayCapUsd, attemptCapUsd, pace } = result.limits;
  const caps = [
    `${usd(result.cycleCapUsd)} a month`,
    ...(weekCapUsd === null ? [] : [`${usd(weekCapUsd)} a week`]),
    ...(dayCapUsd === null ? [] : [`${usd(dayCapUsd)} a day`]),
  ];
  return `At most ${caps.join(', ')} and ${usd(attemptCapUsd)} an attempt, ${PACE_TEXT[pace]}.`;
}

/** A model's short name: `Sonnet 5.5`. */
const modelName = (model: ContributeModel) => MODELS[model].replace(/^Claude /, '');

export type LimitRow = { label: string; value: string };

/** A key connected before: its plan and the settings the API keeps on a replace, with the user's picks. */
export type StoredLimits = {
  plan: ContributeClaudePlan;
  settings: ContributeSettings;
  preferences?: ContributePreferences | null;
};

const PICKED_PACE: Record<ContributePace, string> = {
  EVEN: 'spread across your month',
  FAST: 'as fast as the caps allow',
  QUEUED: 'only on issues you queue',
};

function pickedIssuesOf(preferences: ContributePreferences | null | undefined): string {
  const kinds = preferences?.kinds.length
    ? preferences.kinds.map((kind) => KINDS[kind].toLowerCase()).join(', ')
    : null;
  const size = preferences?.maxSize ? `up to ${SIZES[preferences.maxSize].toLowerCase()}` : null;
  if (!kinds && !size) return 'every kind and size';
  return `${kinds ?? 'every kind'}${size ? `, ${size}` : ''}`;
}

/**
 * "The limits we apply", as the connect will leave them. A first key gets the defaults under the plan's allowance or
 * the user's own numbers. A key connected before keeps its stored settings (`stored`): on the same plan its monthly
 * cap too, on a new plan the plan's allowance, with the attempt cap brought down to it as the API brings it.
 */
export function appliedLimitsOf(
  mode: LimitsMode,
  plan: ContributeClaudePlan,
  manual: ManualLimitsDraft,
  stored: StoredLimits | null = null,
): { limits: LimitRow[]; picked: LimitRow[] } {
  const own = mode === 'manual' ? manualLimitsOf(manual) : null;
  const choice = PLAN_CHOICES.find((entry) => entry.plan === plan);
  const credit = planOf(plan)?.creditUsd ?? null;
  const kept = stored?.settings ?? null;
  const set = own?.ok ? own.limits : null;
  // On the plan path nothing but the plan is sent: the API keeps the cap on the same plan, else takes the plan's.
  const planCap = kept && stored?.plan === plan ? kept.cycleCapUsd : credit;
  const keptAttempt = kept
    ? Math.max(CONNECT_BOUNDS.attemptCapUsd.min, Math.min(kept.attemptCapUsd, planCap ?? kept.attemptCapUsd))
    : CONNECT_DEFAULTS.attemptCapUsd;
  const attempt =
    set?.attemptCapUsd ?? (mode === 'manual' ? (kept?.attemptCapUsd ?? CONNECT_DEFAULTS.attemptCapUsd) : keptAttempt);
  const pace: ContributePace = mode === 'manual' ? manual.pace : (kept?.pace ?? CONNECT_DEFAULTS.pace);
  const week = mode === 'manual' ? (set?.weekCapUsd ?? null) : (kept?.weekCapUsd ?? null);
  const day = mode === 'manual' ? (set?.dayCapUsd ?? null) : (kept?.dayCapUsd ?? null);
  const periodCaps = [
    ...(week === null ? [] : [`${usd(week)} a week`]),
    ...(day === null ? [] : [`${usd(day)} a day`]),
  ];

  const month =
    mode === 'manual'
      ? own?.ok
        ? `at most ${usd(own.cycleCapUsd)}, the amount you set`
        : 'the amount you set above'
      : kept && stored?.plan === plan
        ? `at most ${usd(kept.cycleCapUsd)}, your monthly cap as it is`
        : credit !== null && choice
          ? `up to ${usd(credit)} of your credits, ${choice.label}'s monthly allowance`
          : 'your monthly allowance';
  const { attemptsAtATime, openPrsAtATime, maxChangedLines, maxFiles, mainModel, helperModel } =
    kept ?? CONNECT_DEFAULTS;
  const languages = stored?.preferences?.languages ?? [];

  return {
    limits: [
      { label: 'Each month', value: month },
      { label: 'Each attempt', value: `at most ${usd(attempt)}, it stops at the cap` },
      {
        label: 'Week and day',
        value: periodCaps.length
          ? `${periodCaps.join(', ')}: the smallest cap wins`
          : pace === 'EVEN'
            ? 'no separate cap: pacing spreads the month'
            : 'no separate cap',
      },
      {
        label: 'At a time',
        value: `${attemptsAtATime} attempt${attemptsAtATime === 1 ? '' : 's'}, and at most ${openPrsAtATime} of your PRs open`,
      },
      { label: 'Each PR', value: `at most ${maxChangedLines} changed lines in ${maxFiles} files` },
      {
        label: 'Models',
        value: `${modelName(mainModel)} does the work, ${modelName(helperModel)} helps`,
      },
    ],
    picked: [
      { label: 'Issues', value: pickedIssuesOf(stored?.preferences) },
      {
        label: 'Languages',
        value: languages.length
          ? `${languages.map((language) => LANGUAGES[language]).join(', ')} first`
          : "your profile's first",
      },
      {
        label: 'Pull requests',
        value: kept?.autopilot ? 'autopilot submits the low-risk ones, as you set it' : 'each waits for your review',
      },
      { label: 'Pacing', value: PICKED_PACE[pace] },
    ],
  };
}

/** The reset day's choices: `The 30th (today, our guess)` for the guess. */
export const renewalLabelOf = (day: number, guess: number | null) => {
  const label = ordinalDay(day).replace(/^the/, 'The');
  return day === guess ? `${label} (today, our guess)` : label;
};
