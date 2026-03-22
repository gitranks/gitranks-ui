'use client';

import { useEffect } from 'react';

const TOKEN_QUERY_PARAM = 't';
const TRACKED_TOKENS_KEY = 'tracked_cta_tokens_v1';
const MAX_TRACKED_TOKENS = 50;

function getTrackedTokens(): string[] {
  try {
    const raw = window.sessionStorage.getItem(TRACKED_TOKENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function setTrackedTokens(tokens: string[]) {
  try {
    window.sessionStorage.setItem(TRACKED_TOKENS_KEY, JSON.stringify(tokens.slice(-MAX_TRACKED_TOKENS)));
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

function removeTrackingTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(TOKEN_QUERY_PARAM)) {
    return;
  }
  url.searchParams.delete(TOKEN_QUERY_PARAM);
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

async function sendClickLog(token: string) {
  const payload = JSON.stringify({ token });

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
    const token = url.searchParams.get(TOKEN_QUERY_PARAM);
    if (!token) {
      return;
    }

    const trackedTokens = getTrackedTokens();
    if (trackedTokens.includes(token)) {
      removeTrackingTokenFromUrl();
      return;
    }

    void sendClickLog(token);
    setTrackedTokens([...trackedTokens, token]);
    removeTrackingTokenFromUrl();
  }, []);

  return null;
}
