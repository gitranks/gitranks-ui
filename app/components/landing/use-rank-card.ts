'use client';

import { useEffect, useState } from 'react';

import type { RankCardData } from './rank-card.types';

export type RankCardState = 'loading' | 'ready' | 'unranked' | 'missing';

/** The signed-in visitor's own card. Loaded after the page, from a route cached per user. */
export function useRankCard(): { card: RankCardData | null; state: RankCardState } {
  const [card, setCard] = useState<RankCardData | null>(null);
  const [state, setState] = useState<RankCardState>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me/rank-card')
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
  }, []);

  return { card, state };
}
