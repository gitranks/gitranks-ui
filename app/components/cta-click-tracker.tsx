'use client';

import { useEffect } from 'react';

const SHORT_ID_QUERY_PARAM = 't';
const TRACKED_SHORT_IDS_KEY = 'tracked_cta_short_ids_v1';
const MAX_TRACKED_TOKENS = 50;

function getTrackedShortIds(): string[] {
  try {
    const raw = window.sessionStorage.getItem(TRACKED_SHORT_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function setTrackedShortIds(tokens: string[]) {
  try {
    window.sessionStorage.setItem(TRACKED_SHORT_IDS_KEY, JSON.stringify(tokens.slice(-MAX_TRACKED_TOKENS)));
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

function removeTrackingTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SHORT_ID_QUERY_PARAM)) {
    return;
  }
  url.searchParams.delete(SHORT_ID_QUERY_PARAM);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

async function sendClickLog(shortId: string) {
  const payload = JSON.stringify({ shortId });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    const accepted = navigator.sendBeacon('/api/insight/cta/log', blob);
    if (accepted) {
      return;
    }
  }

  await fetch('/api/insight/cta/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
}

export function CtaClickTracker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const shortId = url.searchParams.get(SHORT_ID_QUERY_PARAM);
    if (!shortId) {
      return;
    }

    const trackedShortIds = getTrackedShortIds();
    if (trackedShortIds.includes(shortId)) {
      removeTrackingTokenFromUrl();
      return;
    }

    void sendClickLog(shortId);
    setTrackedShortIds([...trackedShortIds, shortId]);
    removeTrackingTokenFromUrl();
  }, []);

  return null;
}
