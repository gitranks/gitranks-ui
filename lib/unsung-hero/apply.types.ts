// Applying for the Unsung hero slot, as the API answers it. Enum values come in upper case; dates as ISO strings.

/** A registry we feature packages of, as the API names it (`NPM`, `PYPI`) and as it is written (`npm`, `PyPI`). */
export type ApplyRegistry = { id: string; label: string };

/**
 * A package as the apply page shows it: its registry (`NPM`), its name and the registry's own spelling, its GitHub
 * repository (`owner/name`) when known, and how much it is used: downloads in their period, or the repositories that
 * depend on it for a registry with no download counts.
 */
export type ApplyPackage = {
  registry: string;
  name: string;
  displayName: string | null;
  repository: string | null;
  downloads: number | null;
  downloadsPer: string | null;
  dependents: number | null;
};

export const APPLICATION_STATUSES = ['IN_REVIEW', 'SCHEDULED', 'LIVE', 'FEATURED', 'NOT_PICKED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** The viewer's latest application, whatever its status. `package` is null for a nomination we could not find. */
export type HeroApplication = {
  status: ApplicationStatus;
  package: ApplyPackage | null;
  typed: string | null;
  note: string | null;
  sentAt: string;
  /** The week it is featured, once scheduled. */
  week: { startsAt: string; endsAt: string } | null;
};

/**
 * What the apply page reads, once per load: the registries for everyone; signed in, also who the viewer is (null while
 * their profile is still being set up), their latest application and the packages of repositories they own.
 */
export type HeroApplyView = {
  registries: ApplyRegistry[];
  viewer: { login: string } | null;
  application: HeroApplication | null;
  packages: ApplyPackage[];
};

export type ApplyResolveStatus = 'FOUND' | 'NOT_FOUND' | 'AMBIGUOUS' | 'UNAVAILABLE';

/** What a typed name or registry link turned out to be: one package, several to pick from, or none. */
export type ApplyResolved = { status: ApplyResolveStatus; packages: ApplyPackage[] };

export const APPLY_REFUSALS = [
  'SIGN_IN',
  'OPEN_APPLICATION',
  'PACKAGE_TAKEN',
  'TOO_MANY',
  'BAD_INPUT',
  'NOT_CANCELLABLE',
  'UNAVAILABLE',
] as const;
export type ApplyRefusal = (typeof APPLY_REFUSALS)[number];

/** A send's or a cancel's answer: done (with the application as it now is), or why not. */
export type ApplyAnswer = { ok: boolean; refusal: ApplyRefusal | null; application: HeroApplication | null };

/** What a send carries: a chosen package (`registry` + `name`), or a nomination as typed; and the note. */
export type ApplySendInput = {
  registry?: string;
  name?: string;
  typed?: string;
  note?: string;
};

/** The statuses an application is still open in: one open application per account. */
export const isOpenApplication = (application: Pick<HeroApplication, 'status'> | null | undefined): boolean =>
  !!application && application.status !== 'NOT_PICKED' && application.status !== 'FEATURED';
