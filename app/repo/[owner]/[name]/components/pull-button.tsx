'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { RefreshCw } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import {
  allowanceAfter,
  PULL_MESSAGES,
  PULL_TOASTS,
  type PullDialogKind,
  type PullOutcome,
  pullCheckOf,
  pullErrorOutcomeOf,
  pullLabelOf,
  pullModeOf,
  pullOutcomeOf,
} from '../utils/pull-messages';
import { RefreshDialog, type RefreshDialogAction } from '@/components/refresh-dialogs/refresh-dialog';
import { REFRESH_LABELS, STAR_REPO_URL } from '@/components/refresh-dialogs/refresh-messages';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from '@/lib/auth-providers';
import type { RepoPullAllowance, RepoPullResult, RepoPullStatus } from '@/types/repo-pull.types';
import { timeLeftUntil } from '@/utils/format-time-left';

type PullButtonProps = {
  owner: string;
  name: string;
  /** The repository's latest fetch, as the page was rendered with it. */
  pull?: { status: string; requestedAt?: unknown } | null;
};

type OpenDialog = { kind: PullDialogKind; until?: string } | null;

const TICK_INTERVAL = 1_000;
const CHECK_STATUS_INTERVAL = 20_000;
const PULL_TIMEOUT = 10 * 60 * 1_000;
const FETCH_MESSAGES = ['Fetching…', '🚬 Still fetching', '👀 👀 👀', 'Ping! Still not ready…'];

const pullUrl = (owner: string, name: string) =>
  `/api/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pull`;

const sinceRequest = (requestedAt: unknown) =>
  typeof requestedAt === 'string' ? Date.now() - new Date(requestedAt).getTime() : Number.NaN;

export const PullButton: FC<PullButtonProps> = ({ owner, name, pull }) => {
  const { data: session, status } = useSession();
  const mode = pullModeOf(session, status);
  const url = pullUrl(owner, name);
  const containerRef = useRef<HTMLDivElement>(null);
  const attempt = useRef(0);
  const inFlight = useRef(false);
  const pullIdRef = useRef<string | null>(null);
  const [allowance, setAllowance] = useState<RepoPullAllowance | null>(null);
  const [checking, setChecking] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [loadingLabel, setLoadingLabel] = useState(FETCH_MESSAGES[0]);

  const loadStatus = useCallback(async () => {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as RepoPullStatus) : null;
  }, [url]);

  // Signed-in visitors wait for a running fetch; anyone sends one read for a fetch shown running past the wait.
  useEffect(() => {
    if (mode === 'loading') {
      return;
    }

    const signedIn = mode === 'daily' || mode === 'token';
    const shownRunning = pull?.status === 'running';
    const since = sinceRequest(pull?.requestedAt);
    const waitable = shownRunning && since < PULL_TIMEOUT;

    if (!signedIn && !(shownRunning && !waitable)) {
      return;
    }
    if (signedIn && waitable) {
      setElapsed((prev) => prev ?? Math.max(0, since));
    }

    let cancelled = false;
    loadStatus()
      .then((data) => {
        if (cancelled || !signedIn) {
          return;
        }
        setAllowance(data?.allowance ?? null);
        const running = data?.pull?.status === 'running' ? data.pull : null;
        const runningSince = sinceRequest(running?.requestedAt);
        if (running && runningSince < PULL_TIMEOUT) {
          pullIdRef.current = running.id;
          setElapsed((prev) => prev ?? Math.max(0, runningSince));
        }
      })
      .catch(() => !cancelled && signedIn && setAllowance(null));

    return () => {
      cancelled = true;
    };
  }, [mode, loadStatus, pull?.status, pull?.requestedAt]);

  const checkStatus = useCallback(async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setLoadingLabel('Checking…');
    const data = await loadStatus().catch(() => null);

    switch (pullCheckOf(data, pullIdRef.current)) {
      case 'continue':
        attempt.current += 1;
        setLoadingLabel(FETCH_MESSAGES[attempt.current % FETCH_MESSAGES.length]);
        break;
      case 'stop':
        setElapsed(null);
        break;
      case 'stopFailed':
        setElapsed(null);
        toast.error(PULL_TOASTS.pullFailed);
        break;
      case 'reload':
        // The status read expired the cached page, so a reload shows the new history; no check runs after it.
        setLoadingLabel('Reloading…');
        window.location.reload();
        return;
    }

    inFlight.current = false;
  }, [loadStatus]);

  useEffect(() => {
    if (elapsed === null) {
      return;
    }

    if (elapsed >= PULL_TIMEOUT) {
      toast.info(PULL_TOASTS.timedOut);
      setElapsed(null);
      return;
    }

    const secondsPassed = Math.floor(elapsed / 1000);
    if (secondsPassed > 0 && secondsPassed % (CHECK_STATUS_INTERVAL / 1000) === 0) {
      checkStatus();
    }

    const timer = setTimeout(() => {
      setElapsed((prev) => (prev === null ? null : prev + TICK_INTERVAL));
    }, TICK_INTERVAL);

    return () => clearTimeout(timer);
  }, [elapsed, checkStatus]);

  const openDialog = (next: NonNullable<OpenDialog>) => {
    sendGAEvent('event', 'repo_pull_dialog_open', { kind: next.kind });
    setDialog(next);
  };

  const apply = (outcome: PullOutcome) => {
    switch (outcome.kind) {
      case 'poll':
        if (outcome.toast) {
          toast.success(outcome.toast);
        }
        attempt.current = 0;
        setLoadingLabel(FETCH_MESSAGES[0]);
        setElapsed((prev) => prev ?? 0);
        break;
      case 'dialog':
        openDialog({ kind: outcome.dialog, until: outcome.until });
        break;
      case 'toast':
        if (outcome.tone === 'error') {
          toast.error(outcome.text);
        } else {
          toast.info(outcome.text);
        }
        break;
    }
  };

  const startPull = async () => {
    setDialog(null);
    setChecking(true);

    try {
      const res = await fetch(url, { method: 'POST' });

      if (!res.ok) {
        apply(pullErrorOutcomeOf(res.status));
        return;
      }

      const result = (await res.json()) as RepoPullResult;
      pullIdRef.current = result.status === 'started' ? result.pullId : null;
      setAllowance((prev) => allowanceAfter(result, mode, prev));
      apply(pullOutcomeOf(result, mode));
      loadStatus()
        .then((data) => data && setAllowance(data.allowance))
        .catch(() => {});
    } catch {
      apply(pullErrorOutcomeOf(0));
    } finally {
      setChecking(false);
    }
  };

  const onClick = () => {
    switch (mode) {
      case 'loading':
        return;
      case 'signed-out':
        return openDialog({ kind: 'signIn' });
      case 'daily': {
        const nextAt = allowance?.daily.nextAt;
        if (allowance && !allowance.daily.available && nextAt && new Date(nextAt).getTime() > Date.now()) {
          return openDialog({ kind: 'used', until: nextAt });
        }
        return startPull();
      }
      case 'token':
        return startPull();
    }
  };

  const dialogActions: Record<PullDialogKind, { primary: RefreshDialogAction; secondary?: RefreshDialogAction }> = {
    signIn: { primary: { onClick: () => signIn(IDENTITY_PROVIDER) } },
    needStar: { primary: { href: STAR_REPO_URL }, secondary: { onClick: startPull } },
    used: { primary: { onClick: () => signIn(TOKEN_PROVIDER) } },
    blocked: { primary: { href: STAR_REPO_URL } },
  };

  const cta = (kind: PullDialogKind, action: RefreshDialogAction): RefreshDialogAction => ({
    ...action,
    onClick: () => {
      sendGAEvent('event', 'repo_pull_dialog_cta', { kind });
      action.onClick?.();
    },
  });

  const busyLabel = elapsed !== null ? loadingLabel : checking ? REFRESH_LABELS.checking : null;

  return (
    <div ref={containerRef} className="flex flex-grow flex-col gap-2">
      <Button size="sm" className="flex-grow" onClick={onClick} disabled={busyLabel !== null}>
        {busyLabel !== null ? (
          <>
            {busyLabel}
            <ClipLoader loading size={16} color="currentColor" />
          </>
        ) : (
          <>
            {pullLabelOf(mode, allowance)}
            <RefreshCw className="size-4" />
          </>
        )}
      </Button>
      {elapsed !== null && (
        <div className="text-xs text-muted-foreground">
          Next check in {Math.floor((CHECK_STATUS_INTERVAL - (elapsed % CHECK_STATUS_INTERVAL)) / 1000)} s
        </div>
      )}
      {dialog && (
        <RefreshDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          message={PULL_MESSAGES[dialog.kind]}
          time={dialog.until ? timeLeftUntil(dialog.until) : undefined}
          primary={cta(dialog.kind, dialogActions[dialog.kind].primary)}
          secondary={dialogActions[dialog.kind].secondary}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            containerRef.current?.querySelector('button')?.focus();
          }}
        />
      )}
    </div>
  );
};
