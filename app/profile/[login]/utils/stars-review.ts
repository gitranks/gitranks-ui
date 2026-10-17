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

/** The owner's state: `loading` until it arrives, `public` when it is not available to this visitor. */
export type StarsReviewOwnerLoad = StarsReviewOwnerState | 'loading' | 'public';

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

/** `17 Oct 2026`, in UTC like the site's other dates. */
export function formatReviewDate(iso: string) {
  const parts = Object.fromEntries(reviewDate.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
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
  /** A report is being sent. */
  pending: boolean;
};

export function starsReviewReportState({
  reportable,
  viewer,
  owner,
  pending,
}: ReportStateInput): StarsReviewReportState {
  if (viewer === 'owner') {
    if (owner === 'public') {
      // Signed in under the profile's login, yet there is nothing this visitor can report.
      return { kind: 'none' };
    }

    if (owner === 'loading') {
      return reportable ? { kind: 'button', action: 'wait' } : { kind: 'none' };
    }

    if (owner.report && owner.decision === 'declined' && owner.decidedAt) {
      return { kind: 'declined', decidedAt: owner.decidedAt };
    }

    if (owner.report) {
      return { kind: 'submitted', submittedAt: owner.report.submittedAt };
    }

    if (!owner.reportable) {
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

/** The owner's state, or null when this visitor cannot see it (not the owner, nothing held, or a failure). */
export async function fetchStarsReviewOwnerState(login: string): Promise<StarsReviewOwnerState | null> {
  try {
    const response = await fetch(starsReviewPath(login), { cache: 'no-store' });

    return response.ok ? ((await response.json()) as StarsReviewOwnerState) : null;
  } catch {
    return null;
  }
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
