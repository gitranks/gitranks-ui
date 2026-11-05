'use client';

import { useEffect, useState } from 'react';

import type { RankCardData } from './rank-card.types';

export type RankCardState = 'loading' | 'ready' | 'unranked' | 'missing';

/**
 * The signed-in visitor's own card. Loaded after the page, from a route cached per user. The login is in the URL
 * because the browser caches by URL: without it, a new sign-in would get the previous account's card. Its caller is
 * keyed by the login, so another login starts from a fresh state.
 */
export function useRankCard(login: string): { card: RankCardData | null; state: RankCardState } {
  const [card, setCard] = useState<RankCardData | null>(null);
  const [state, setState] = useState<RankCardState>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/rank-card?login=${encodeURIComponent(login)}`)
      .then(async (res) => {
        if (res.status === 404) return 'unranked' as const;
        return res.ok ? ((await res.json()) as RankCardData) : null;
      })
      .then((data) => {
        if (cancelled) return;
        if (data === 'unranked') {
          setState('unranked');
          return;
        }
        if (!data) {
          setState('missing');
          return;
        }
        setCard(data);
        setState('ready');
      })
      .catch(() => !cancelled && setState('missing'));
    return () => {
      cancelled = true;
    };
  }, [login]);

  return { card, state };
}
