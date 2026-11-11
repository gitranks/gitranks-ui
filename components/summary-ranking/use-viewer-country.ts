'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import type { RankCardData } from '@/app/components/landing/rank-card.types';

/**
 * The signed-in viewer's country, from their rank card (the browser keeps it 5 minutes). Null when signed out,
 * unranked, without a country, or while it loads.
 */
export function useViewerCountry(): string | null {
  const { data: session } = useSession();
  const login = session?.user.githubLogin;
  const [country, setCountry] = useState<{ login: string; name: string | null } | null>(null);

  useEffect(() => {
    if (!login) {
      return;
    }
    let cancelled = false;
    fetch(`/api/me/rank-card?login=${encodeURIComponent(login)}`)
      .then((res) => (res.ok ? (res.json() as Promise<RankCardData>) : null))
      .then((card) => !cancelled && setCountry({ login, name: card?.country ?? null }))
      .catch(() => !cancelled && setCountry({ login, name: null }));
    return () => {
      cancelled = true;
    };
  }, [login]);

  return login && country?.login === login ? country.name : null;
}
