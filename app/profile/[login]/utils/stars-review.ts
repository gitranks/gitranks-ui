import { type PageProfileOverviewQuery, StarsReviewStatus } from '@/types/generated/graphql';

export type StarsReview = NonNullable<NonNullable<PageProfileOverviewQuery['user']>['starsReview']>;

/** What the profile's owner sees beyond the public note. */
export type StarsReviewOwnerState = {
  status: StarsReviewStatus;
  stars: number;
  repositories: number;
  reportable: boolean;
  report: { submittedAt: string } | null;
  decision: 'declined' | null;
  decidedAt: string | null;
};

/** Who is looking at the profile; `loading` until the session is known. */
export type StarsReviewViewer = 'loading' | 'anonymous' | 'other' | 'owner';

/** The owner's state as read: `public` when this visitor has none to see, `failed` when it could not be read. */
export type StarsReviewOwnerRead = StarsReviewOwnerState | 'public' | 'failed';

/** The owner's state, `loading` until it arrives. */
export type StarsReviewOwnerLoad = StarsReviewOwnerRead | 'loading';

export type StarsReviewReportResult =
  | { outcome: 'sent'; submittedAt: string }
  /** `failed`: the report can be sent again; `closed`: the review changed, so it can't. */
  | { outcome: 'failed' | 'closed'; owner: StarsReviewOwnerRead };

export type StarsReviewReportState =
  | { kind: 'none' }
  | { kind: 'button'; action: 'wait' | 'signIn' | 'switchAccount' | 'report' }
  | { kind: 'submitted'; submittedAt: string }
  | { kind: 'declined'; decidedAt: string };

const count = (value: number, one: string, many: string) =>
  `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`;

export function starsReviewNote({
  status,
  stars,
  repositories,
}: Pick<StarsReview, 'status' | 'stars' | 'repositories'>) {
  const held = `${count(stars, 'star', 'stars')} on ${count(repositories, 'repository', 'repositories')}`;
  const verb = stars === 1 ? "doesn't" : "don't";

  if (status === StarsReviewStatus.NotCounted) {
    const reason = stars === 1 ? "it doesn't" : "they don't";
    const projects = repositories === 1 ? 'the project' : 'the projects';
    return `${held} ${verb} count toward this ranking: ${reason} look like organic interest in ${projects}.`;
  }

  return `We're reviewing an unusual starring pattern. Until we're done, ${held} ${verb} count toward this ranking.`;
}

const reviewDate = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `17 Oct 2026`, in UTC like the site's other dates; null for a value that is not a date. */
export function formatReviewDate(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = Object.fromEntries(reviewDate.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.day} ${parts.month} ${parts.year}`;
}

export function starsReviewViewer(
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated',
  sessionLogin: string | null | undefined,
  login: string,
): StarsReviewViewer {
  if (sessionStatus === 'loading') {
    return 'loading';
  }

  if (sessionStatus === 'unauthenticated' || !sessionLogin) {
    return 'anonymous';
  }

  return sessionLogin.toLowerCase() === login.toLowerCase() ? 'owner' : 'other';
}

type ReportStateInput = {
  /** From the cached page; the owner's own state, once loaded, is newer. */
  reportable: boolean;
  viewer: StarsReviewViewer;
  owner: StarsReviewOwnerLoad;
  /** The date of a report this page sent. */
  sentAt: string | null;
  /** A report is being sent. */
  pending: boolean;
};

export function starsReviewReportState({
  reportable,
  viewer,
  owner,
  sentAt,
  pending,
}: ReportStateInput): StarsReviewReportState {
  if (viewer === 'owner') {
    const state = typeof owner === 'object' ? owner : null;

    if (state?.report && state.decision === 'declined' && state.decidedAt) {
      return { kind: 'declined', decidedAt: state.decidedAt };
    }

    const submittedAt = sentAt ?? state?.report?.submittedAt;

    if (submittedAt) {
      return { kind: 'submitted', submittedAt };
    }

    if (owner === 'public') {
      // Signed in under the profile's login, yet there is nothing this visitor can report.
      return { kind: 'none' };
    }

    if (owner === 'loading') {
      return reportable ? { kind: 'button', action: 'wait' } : { kind: 'none' };
    }

    // A failed read leaves the cached page to decide.
    if (!(state ? state.reportable : reportable)) {
      return { kind: 'none' };
    }

    return { kind: 'button', action: pending ? 'wait' : 'report' };
  }

  if (!reportable) {
    return { kind: 'none' };
  }

  if (viewer === 'loading') {
    return { kind: 'button', action: 'wait' };
  }

  return { kind: 'button', action: viewer === 'anonymous' ? 'signIn' : 'switchAccount' };
}

const starsReviewPath = (login: string) => `/api/profile/${encodeURIComponent(login)}/stars-review`;

/** The owner's state; `public` when this visitor is not the owner or nothing is held. */
export async function fetchStarsReviewOwnerState(login: string): Promise<StarsReviewOwnerRead> {
  try {
    const response = await fetch(starsReviewPath(login), { cache: 'no-store' });

    if (response.status === 403 || response.status === 404) {
      return 'public';
    }

    return response.ok ? ((await response.json()) as StarsReviewOwnerState) : 'failed';
  } catch {
    return 'failed';
  }
}

/** Reads the owner's state for the owner only; null, with no request, for anyone else. */
export function loadStarsReviewOwnerState(viewer: StarsReviewViewer, login: string) {
  return viewer === 'owner' ? fetchStarsReviewOwnerState(login) : null;
}

/** Sends the owner's report. The date it was stored, also when it had been sent before; null when it was not. */
export async function submitStarsReviewReport(login: string): Promise<string | null> {
  try {
    const response = await fetch(starsReviewPath(login), { method: 'POST' });

    if (!response.ok && response.status !== 409) {
      return null;
    }

    const { submittedAt } = (await response.json()) as { submittedAt?: unknown };

    return typeof submittedAt === 'string' ? submittedAt : null;
  } catch {
    return null;
  }
}

/** Sends the owner's report; when it is not stored, reads the owner's state again, as the review may have changed. */
export async function sendStarsReviewReport(login: string): Promise<StarsReviewReportResult> {
  const submittedAt = await submitStarsReviewReport(login);

  if (submittedAt) {
    return { outcome: 'sent', submittedAt };
  }

  const owner = await fetchStarsReviewOwnerState(login);
  const open = owner === 'failed' || (typeof owner === 'object' && owner.reportable && !owner.report);

  return { outcome: open ? 'failed' : 'closed', owner };
}
