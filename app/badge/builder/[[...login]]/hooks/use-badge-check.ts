'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BadgeCheckKind, BadgeCheckResult } from '@/types/daily-updates.types';

const UNAVAILABLE: BadgeCheckResult = { status: 'unavailable' };

export type BadgeCheckState = {
  /** The last answer for this profile or repository; `null` before the first check. */
  result: BadgeCheckResult | null;
  checking: boolean;
  check: () => void;
};

/**
 * "Check my badge" for one profile or repository: no sign-in, and nothing kept in the browser. A failed call reads as
 * `unavailable`. The answer is dropped when the entity changes.
 */
export function useBadgeCheck(kind: BadgeCheckKind, name: string): BadgeCheckState {
  const [result, setResult] = useState<BadgeCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const entity = `${kind}:${name}`;
  const current = useRef(entity);
  // One check at a time: a second press while one runs does nothing.
  const running = useRef(false);

  useEffect(() => {
    current.current = entity;
    running.current = false;
    setResult(null);
    setChecking(false);
  }, [entity]);

  const check = useCallback(() => {
    if (running.current) {
      return;
    }
    const asked = `${kind}:${name}`;
    running.current = true;
    setChecking(true);
    fetch('/api/daily-updates/badge-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name }),
      cache: 'no-store',
    })
      .then((res) => (res.ok ? (res.json() as Promise<BadgeCheckResult>) : UNAVAILABLE))
      .catch(() => UNAVAILABLE)
      .then((answer) => {
        if (current.current === asked) {
          running.current = false;
          setResult(answer);
          setChecking(false);
        }
      });
  }, [kind, name]);

  return { result, checking, check };
}
