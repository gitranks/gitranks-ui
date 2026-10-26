'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { RefreshCw } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { type FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import {
  PULL_MESSAGES,
  PULL_TOASTS,
  type PullDialogKind,
  type PullOutcome,
  pullErrorOutcomeOf,
  pullHintOf,
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const attempt = useRef(0);
  const [allowance, setAllowance] = useState<RepoPullAllowance | null>(null);
  const [checking, setChecking] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [loadingLabel, setLoadingLabel] = useState(FETCH_MESSAGES[0]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setElapsed(null);
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as RepoPullStatus) : null;
  }, [url]);

  // A fetch was running when the page was rendered: wait for it, unless it is long given up.
  useLayoutEffect(() => {
    if (pull?.status !== 'running') {
      return;
    }

    const since = sinceRequest(pull.requestedAt);
    if (Number.isFinite(since) && since < PULL_TIMEOUT) {
      setElapsed(Math.max(0, since));
    }
  }, [pull?.status, pull?.requestedAt]);

  useEffect(() => {
    if (mode !== 'daily' && mode !== 'token') {
      return;
    }

    loadStatus()
      .then((data) => {
        setAllowance(data?.allowance ?? null);
        if (data?.pull?.status === 'running') {
          setElapsed((prev) => prev ?? 0);
        }
      })
      .catch(() => setAllowance(null));
  }, [mode, loadStatus]);

  const checkStatus = useCallback(async () => {
    setLoadingLabel('Checking…');
    const data = await loadStatus().catch(() => null);

    if (!data || data.pull?.status === 'running') {
      attempt.current += 1;
      setLoadingLabel(FETCH_MESSAGES[attempt.current % FETCH_MESSAGES.length]);
      return;
    }

    if (data.pull?.status === 'failed') {
      stopPolling();
      toast.error(PULL_TOASTS.pullFailed);
      return;
    }

    // Done: the status read expired the cached page, so a reload shows the new history.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setLoadingLabel('Reloading…');
    window.location.reload();
  }, [loadStatus, stopPolling]);

  useEffect(() => {
    if (elapsed === null) {
      return;
    }

    const secondsPassed = Math.floor(elapsed / 1000);
    if (secondsPassed > 0 && secondsPassed % (CHECK_STATUS_INTERVAL / 1000) === 0) {
      checkStatus();
    }

    if (elapsed >= PULL_TIMEOUT) {
      toast.info(PULL_TOASTS.timedOut);
      setElapsed(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      setElapsed((prev) => (prev ?? 0) + TICK_INTERVAL);
    }, TICK_INTERVAL);
  }, [elapsed, checkStatus]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

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

      apply(pullOutcomeOf((await res.json()) as RepoPullResult, mode));
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
  const hint = elapsed === null ? pullHintOf(mode, allowance) : null;

  return (
    <div ref={containerRef} className="flex flex-col items-start gap-2">
      <Button size="sm" onClick={onClick} disabled={busyLabel !== null}>
        {busyLabel !== null ? (
          <>
            {busyLabel}
            <ClipLoader loading size={16} color="currentColor" />
          </>
        ) : (
          <>
            Fetch star history
            <RefreshCw className="size-4" />
          </>
        )}
      </Button>
      {elapsed !== null && (
        <div className="text-xs text-muted-foreground">
          Next check in {Math.floor((CHECK_STATUS_INTERVAL - (elapsed % CHECK_STATUS_INTERVAL)) / 1000)} s
        </div>
      )}
      {!!hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
