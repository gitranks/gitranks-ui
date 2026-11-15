'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { Check, RefreshCw } from 'lucide-react';
import type { Route } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import {
  Children,
  type ComponentProps,
  cloneElement,
  type FC,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { DailyUpdatesLine } from '@/components/daily-updates/daily-updates-line';
import { RefreshDialog, type RefreshDialogAction } from '@/components/refresh-dialogs/refresh-dialog';
import {
  DAILY_UPDATES_LINES,
  fillLogin,
  REFRESH_LABELS,
  REFRESH_MESSAGES,
  REFRESH_TOASTS,
  type RefreshDialogKind,
  STAR_REPO_URL,
  withLogin,
} from '@/components/refresh-dialogs/refresh-messages';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from '@/lib/auth-providers';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { cn } from '@/lib/utils';
import type { DailyRefreshResult, DailyRefreshStatus } from '@/types/daily-refresh.types';
import { ProfileFetchingStatusDocument, type UserFetchingStatus } from '@/types/generated/graphql';
import { type DailyUpdatesFacts, profileUpdatesViewOf } from '@/utils/daily-updates-view';
import { timeLeftUntil } from '@/utils/format-time-left';
import { refreshModeOf } from '@/utils/refresh-mode';

type FetchUserButtonProps = {
  className?: string;
  fetchingStatus?: UserFetchingStatus | null;
  fetchingUpdatedAt?: number | null;
  children: ReactElement<ComponentProps<'button'>>;
  /** The label on the user's own profile while today's refresh on our token is unused. */
  dailyLabel?: ReactNode;
  /** The profile's daily updates, as the page's data has them; `null` or missing while it is not on them. */
  dailyUpdates?: DailyUpdatesFacts;
  /** The profile's login as GitHub writes it, for the copy; the URL's spelling when missing. */
  profileLogin?: string;
};

/** The dialog on screen; `until` fills its `{time}`. */
type OpenDialog = { kind: RefreshDialogKind; until?: string } | null;

const REFRESH_INTERVAL = 1_000;
const CHECK_STATUS_INTERVAL = 20_000;
const REFRESH_TIMEOUT = 10 * 60 * 1_000;
const FETCH_MESSAGES = ['Fetching…', '🚬 Still fetching', '👀 👀 👀', 'Ping! Still not ready…'];

// The server expires the cache only when the profile's fetch status changed since it last did.
const revalidateProfile = (login: string) =>
  fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login }),
  });

export const FetchUserButton: FC<FetchUserButtonProps> = ({
  fetchingStatus,
  fetchingUpdatedAt,
  className,
  children,
  dailyLabel,
  dailyUpdates,
  profileLogin,
}) => {
  const { data: session, status } = useSession();
  const { login } = useParams<{ login: string }>();
  const router = useRouter();
  const mode = refreshModeOf(session, login, status);
  const view = profileUpdatesViewOf(mode, dailyUpdates);
  const shownLogin = profileLogin ?? login;
  const containerRef = useRef<HTMLDivElement>(null);
  const [daily, setDaily] = useState<DailyRefreshStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const fetchAttempt = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingLabel, setLoadingLabel] = useState(FETCH_MESSAGES[fetchAttempt.current]);
  const [fetchingDuration, setFetchingDuration] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (fetchingStatus !== 'FETCHING') {
      return;
    }

    const now = Date.now();
    const initialFetchingDuration = now - (fetchingUpdatedAt || now);

    if (initialFetchingDuration >= REFRESH_TIMEOUT) {
      return;
    }

    // the fetch may have finished before this page was served; if so, the server expires the cached
    // pages, so the next load shows the fetched profile
    revalidateProfile(login);

    setFetchingDuration(initialFetchingDuration);
  }, [fetchingStatus, fetchingUpdatedAt, login]);

  const checkFetchingStatus = useCallback(async () => {
    setLoadingLabel('Checking…');
    const data = await graphqlClient(ProfileFetchingStatusDocument, { login });

    if (data.user === null) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setFetchingDuration(null);
      toast.error('User not found on GitHub');
      return;
    }

    if (data.user?.fetchingStatus === 'FETCHING') {
      fetchAttempt.current += 1;
      setLoadingLabel(FETCH_MESSAGES[fetchAttempt.current % FETCH_MESSAGES.length]);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setLoadingLabel('Reloading…');

      await revalidateProfile(login);
      window.location.reload();
    }
  }, [login]);

  const fetchUser = async () => {
    setFetchingDuration(0);

    // capture('profile.fetch', { login });

    // the cache is invalidated server-side once the fetch has started
    const res = await fetch(`/api/profile/${login}`, { method: 'POST' });

    if (!res.ok) {
      toast.error(res.status === 410 ? REFRESH_TOASTS.removed : 'Failed to fetch user profile');
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setFetchingDuration(null);
    }
  };

  useEffect(() => {
    if (mode !== 'daily') {
      return;
    }

    fetch('/api/daily-refresh')
      .then((res) => (res.ok ? (res.json() as Promise<DailyRefreshStatus>) : null))
      .then(setDaily)
      .catch(() => setDaily(null));
  }, [mode]);

  const openDialog = (next: NonNullable<OpenDialog>) => {
    sendGAEvent('event', 'refresh_dialog_open', { kind: next.kind });
    setDialog(next);
  };

  /** Asks the server, which asks GitHub live, whether the star is there; never a remembered answer. */
  const claimDailyRefresh = async () => {
    setDialog(null);
    setChecking(true);

    try {
      const res = await fetch('/api/daily-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login }),
      });

      if (!res.ok) {
        toast.error(res.status === 410 ? REFRESH_TOASTS.removed : REFRESH_TOASTS.checkFailed);
        return;
      }

      const result = (await res.json()) as DailyRefreshResult;

      switch (result.status) {
        case 'started':
          setDaily({ available: false, nextAt: result.nextAt });
          toast.success(REFRESH_TOASTS.started);
          setFetchingDuration(0);
          break;
        case 'fetching':
          setFetchingDuration(0);
          break;
        case 'not_starred':
          openDialog({ kind: 'needStar' });
          break;
        case 'blocked':
          openDialog({ kind: 'blocked', until: result.until });
          break;
        case 'used':
          setDaily({ available: false, nextAt: result.nextAt });
          openDialog({ kind: 'used', until: result.nextAt });
          break;
        case 'not_own':
          openDialog({ kind: 'otherProfile' });
          break;
        case 'busy':
          toast.info(REFRESH_TOASTS.busy);
          break;
      }
    } catch {
      toast.error(REFRESH_TOASTS.checkFailed);
    } finally {
      setChecking(false);
    }
  };

  // While the session loads a press does nothing, as Refresh: read as signed out, the dialog would offer the light
  // sign-in to a token user, and taking it would swap their token session for a light one.
  const onUpdatesDailyClick = () => {
    if (mode === 'loading') {
      return;
    }
    openDialog({ kind: view === 'visitor-on-badge' ? 'whyDailyBadge' : 'whyDailyOwner' });
  };

  /**
   * Until a visitor can turn daily updates on here, "Get daily updates" leads to their own profile; signed out, to the
   * sign-in. Nothing while the session loads, for the reason above.
   */
  const getDailyUpdates = () => {
    if (mode === 'loading') {
      return;
    }
    const ownLogin = session?.user?.githubLogin;
    if (!ownLogin) {
      return openDialog({ kind: 'signIn' });
    }
    setDialog(null);
    router.push(`/profile/${encodeURIComponent(ownLogin)}`);
  };

  /** The badge builder, on a developer's badges: the visitor's own when signed in. */
  const makeBadge = () => {
    setDialog(null);
    router.push(builderHref({ kind: 'user', name: session?.user?.githubLogin ?? '' }) as Route);
  };

  const onRefreshClick = () => {
    switch (mode) {
      case 'loading':
        return;
      case 'signed-out':
        return openDialog({ kind: 'signIn' });
      case 'other':
        return openDialog({ kind: 'otherProfile' });
      case 'token':
        return fetchUser();
      case 'daily':
        if (daily?.nextAt && new Date(daily.nextAt).getTime() > Date.now()) {
          return openDialog({ kind: 'used', until: daily.nextAt });
        }
        return claimDailyRefresh();
    }
  };

  useEffect(() => {
    if (fetchingDuration === null) {
      return;
    }

    const secondsPassed = Math.floor(fetchingDuration / 1000);
    if (secondsPassed > 0 && secondsPassed % (CHECK_STATUS_INTERVAL / 1000) === 0) {
      checkFetchingStatus();
    }

    if (fetchingDuration >= REFRESH_TIMEOUT) {
      toast.error('Fetching user profile took too long. Please try again later.');
      setFetchingDuration(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      setFetchingDuration((prev) => (prev || 0) + REFRESH_INTERVAL);
    }, REFRESH_INTERVAL);
  }, [fetchingDuration, checkFetchingStatus]);

  const child = Children.only(children);
  const busyLabel = fetchingDuration !== null ? loadingLabel : checking ? REFRESH_LABELS.checking : null;
  const childWithOnClick = cloneElement(child, {
    onClick: onRefreshClick,
    disabled: busyLabel !== null,
    children:
      busyLabel !== null ? (
        <>
          {busyLabel}
          <ClipLoader loading size={16} color="currentColor" />
        </>
      ) : mode === 'daily' && daily?.available && dailyLabel ? (
        dailyLabel
      ) : (
        child.props.children
      ),
  });

  const cta = (kind: RefreshDialogKind, action: RefreshDialogAction): RefreshDialogAction => ({
    ...action,
    onClick: () => {
      sendGAEvent('event', 'refresh_dialog_cta', { kind });
      action.onClick?.();
    },
  });

  const signInWithToken = () => signIn(TOKEN_PROVIDER);
  const dialogActions: Record<RefreshDialogKind, { primary: RefreshDialogAction; secondary?: RefreshDialogAction }> = {
    signIn: { primary: { onClick: () => signIn(IDENTITY_PROVIDER) } },
    needStar: { primary: { href: STAR_REPO_URL }, secondary: { onClick: claimDailyRefresh } },
    used: { primary: { onClick: signInWithToken } },
    otherProfile: { primary: { onClick: signInWithToken } },
    blocked: { primary: { href: STAR_REPO_URL } },
    whyDailyOwner: { primary: { onClick: getDailyUpdates } },
    whyDailyBadge: { primary: { onClick: makeBadge } },
  };

  // Someone else's profile that updates every day: the press says why. A fetch in flight keeps today's button.
  const updatesDaily = (view === 'visitor-on-owner' || view === 'visitor-on-badge') && busyLabel === null;

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-2', className)}>
      {updatesDaily ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={child.props.className}
            onClick={onUpdatesDailyClick}
          >
            <Check className="size-4" aria-hidden />
            {REFRESH_LABELS.updatesDaily}
          </Button>
          <DailyUpdatesLine
            lead={
              view === 'visitor-on-badge'
                ? DAILY_UPDATES_LINES.byBadge
                : fillLogin(DAILY_UPDATES_LINES.byOwner, shownLogin)
            }
            nextUpdateAt={dailyUpdates?.nextUpdateAt}
          />
        </>
      ) : (
        childWithOnClick
      )}
      {dialog && (
        <RefreshDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          message={withLogin(REFRESH_MESSAGES[dialog.kind], shownLogin)}
          time={dialog.until ? timeLeftUntil(dialog.until) : undefined}
          primary={cta(dialog.kind, dialogActions[dialog.kind].primary)}
          secondary={dialogActions[dialog.kind].secondary}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            containerRef.current?.querySelector('button')?.focus();
          }}
        />
      )}
      {fetchingDuration !== null && (
        <div className="text-xs text-muted-foreground">
          Next check in {Math.floor((CHECK_STATUS_INTERVAL - (fetchingDuration % CHECK_STATUS_INTERVAL)) / 1000)} s
        </div>
      )}
    </div>
  );
};

export const FetchUserButtonForNotFoundPage: FC<Omit<FetchUserButtonProps, 'children'>> = (props) => {
  return (
    <FetchUserButton {...props}>
      <Button size="lg">Fetch profile from GitHub</Button>
    </FetchUserButton>
  );
};

export const FetchUserButtonForProfilePage: FC<Omit<FetchUserButtonProps, 'children'>> = (props) => {
  return (
    <FetchUserButton
      {...props}
      className={cn('flex-grow', props.className)}
      dailyLabel={
        <>
          {REFRESH_LABELS.dailyAvailable}
          <RefreshCw className="size-4" />
        </>
      }
    >
      <Button size="sm" className="flex-grow">
        Refresh
        <RefreshCw className="size-4" />
      </Button>
    </FetchUserButton>
  );
};
