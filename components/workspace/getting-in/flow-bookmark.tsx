'use client';

import type { Route } from 'next';
import { createContext, type ReactNode, useContext, useEffect } from 'react';

import type { FlowSide } from '@/lib/workspace/getting-in';
import {
  BOOKMARK_KEY,
  bookmarkOf,
  keptBookmarks,
  withBookmark,
  withoutBookmark,
} from '@/lib/workspace/getting-in-bookmark';

/** Writes the record, or removes it for null; with storage off or blocked nothing is kept. */
function store(record: string | null) {
  try {
    if (record) window.localStorage.setItem(BOOKMARK_KEY, record);
    else window.localStorage.removeItem(BOOKMARK_KEY);
  } catch {
    // Storage is off: the flow works without its bookmark.
  }
}

function stored(): string | null {
  try {
    return window.localStorage.getItem(BOOKMARK_KEY);
  } catch {
    return null;
  }
}

/** The step `side`'s flow was last on in this browser, when there is one under 30 days old. */
export function readFlowBookmark(side: FlowSide): Route | null {
  const record = stored();
  const now = Date.now();
  // Older or broken records are removed as they are found.
  const kept = keptBookmarks(record, now);
  if (kept !== record) store(kept);
  return bookmarkOf(kept, side, now);
}

/** Forgets `side`'s step: its person left the flow into the workspace. */
export function forgetFlowBookmark(side: FlowSide) {
  store(withoutBookmark(stored(), side, Date.now()));
}

/** Notes this step's address (path and query) as `side`'s bookmark when the step is shown. */
export function FlowBookmark({ side }: { side: FlowSide }) {
  useEffect(() => {
    store(withBookmark(stored(), side, `${window.location.pathname}${window.location.search}`, Date.now()));
  }, [side]);
  return null;
}

/** Whether a part is drawn inside a flow's way out (`FlowExit`): a masked row's "See the full issue" leaves the flow there. */
const InFlowExitContext = createContext(false);

/** Inside `FlowExit`: the ways out a part draws are marked `data-flow-leave`. */
export const useInFlowExit = () => useContext(InFlowExitContext);

/**
 * Around the part of a step that leaves the flow into the workspace (a Start, Skip for now, a masked row's "See the
 * full issue"): a click on a Start control or on a control marked `data-flow-leave` forgets `side`'s step, so the
 * landing no longer resumes there. The masked rows inside mark their own button (`useInFlowExit`).
 */
export function FlowExit({ side, children }: { side: FlowSide; children: ReactNode }) {
  return (
    // It only listens to the clicks of the controls inside; a keyboard press on one arrives as its click.
    <div
      className="contents"
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest(FLOW_WAYS_OUT)) {
          forgetFlowBookmark(side);
        }
      }}
    >
      <InFlowExitContext.Provider value={true}>{children}</InFlowExitContext.Provider>
    </div>
  );
}

/** The controls that leave the flow: a Start control, or anything marked `data-flow-leave`. */
export const FLOW_WAYS_OUT = '[data-start-control], [data-flow-leave]';
