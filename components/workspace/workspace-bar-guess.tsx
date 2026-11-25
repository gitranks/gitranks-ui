'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect } from 'react';

import { markBarGuess, workspaceBarGuessOf } from '@/lib/workspace/workspace-bar-guess';

/**
 * Keeps the guess of the workspace's bar current on `<html>` (`workspaceBarGuessOf`). The head's script makes it once,
 * on the first load; the workspace's layout shows its fallback again whenever it is entered from another layout (Learn
 * to Learn's "Pull requests", home to `/contribute`), so the guess is made again on every change of path or query,
 * before the frame paints. It reads the path and the query, so it renders inside a Suspense boundary. Renders nothing.
 */
export function WorkspaceBarGuess() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useLayoutEffect(() => {
    markBarGuess(document.documentElement, workspaceBarGuessOf(pathname, new URLSearchParams(query), document.cookie));
  }, [pathname, query]);
  return null;
}
