'use client';

import { useEffect, useState } from 'react';

import { readBuildKeyWithin } from '@/components/build/build-viewer';
import { buildDoorsMinePath } from '@/lib/build/paths';
import type { BuildDoors } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/*
 * The doors into Build are drawn only for a signed-in person, once their browser read them: a cached page of Learn's or
 * Contribute's is the same for everyone, so the server draws the page and no door. The doors of one
 * course are read once for the document and shared by every part that draws one (the course's line and its row in
 * "Go further").
 */

/** What a door is read for: a course, or the course of an issue's lesson. */
export type BuildDoorsOf = { course: string } | { lesson: string };

const reads = new Map<string, Promise<BuildDoors | null>>();

/** The answer as the doors use it, or null when it is not one they can draw. */
function doorsOf(value: unknown): BuildDoors | null {
  if (!value || typeof value !== 'object') return null;
  const { projects, builds } = value as Record<string, unknown>;
  return Array.isArray(projects) && Array.isArray(builds) ? (value as BuildDoors) : null;
}

/**
 * The doors of a course, once for the document: none when the read failed. A browser with no session asks nothing:
 * the route answers none signed out.
 */
export function readBuildDoors(of: BuildDoorsOf): Promise<BuildDoors | null> {
  const path = buildDoorsMinePath(of);
  let read = reads.get(path);
  if (!read) {
    read = (async () => (hasSessionHint(document.cookie) ? doorsOf(await readBuildKeyWithin(path, 'doors')) : null))();
    reads.set(path, read);
  }
  return read;
}

/** The doors of a course as this browser knows them: none while hydrating, until read, and for anyone closed. */
export function useBuildDoors(of: BuildDoorsOf | null): BuildDoors | null {
  const key = of ? buildDoorsMinePath(of) : null;
  const [read, setRead] = useState<{ key: string; doors: BuildDoors | null } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` names `of` whole.
  useEffect(() => {
    if (!of || !key) return;
    let live = true;
    void readBuildDoors(of).then((doors) => {
      if (live) setRead({ key, doors });
    });
    return () => {
      live = false;
    };
  }, [key]);
  return read && read.key === key ? read.doors : null;
}

/** Forgets every read (tests). */
export function forgetBuildDoors(): void {
  reads.clear();
}
