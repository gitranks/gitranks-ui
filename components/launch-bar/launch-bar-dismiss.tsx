'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { XIcon } from 'lucide-react';
import { type ReactNode, useEffect, useLayoutEffect } from 'react';

import {
  hideLaunchBar,
  LAUNCH_BAR_ATTR,
  LAUNCH_BAR_OFF,
  type LaunchBarId,
  launchBarAt,
  launchBarOff,
  nextLaunchBarSwitch,
} from './launch-bar.consts';
import { Button } from '@/components/ui/button';

/** A bar's X: hides that bar in this browser for good. A 44px target on phones. */
export function LaunchBarDismiss({ bar }: { bar: LaunchBarId }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Hide this announcement"
      className="text-muted-foreground max-md:-mr-3.5 max-md:size-11"
      onClick={() => {
        sendGAEvent('event', 'launch_bar_dismiss', { bar });
        hideLaunchBar(bar, 'dismissed');
        // The X is gone with the bar: keyboard focus moves to the page's first link, the logo.
        document.querySelector<HTMLElement>('header a')?.focus();
      }}
    >
      <XIcon />
    </Button>
  );
}

/** A Product Hunt bar's link: opens Product Hunt in a new tab and counts the click. */
export function ProductHuntBarLink({
  bar,
  href,
  className,
  children,
}: {
  bar: LaunchBarId;
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    // `noopener` without `noreferrer`: Product Hunt sees the visit came from gitranks.com.
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={className}
      onClick={() => sendGAEvent('event', 'launch_bar_click', { bar })}
    >
      {children}
    </a>
  );
}

/**
 * On Contribute's pages: this browser has seen Contribute, so Contribute's bar stays hidden from now on. Before paint,
 * so a move into Contribute never shows it for a frame. The Product Hunt bars stay. Renders nothing.
 */
export function LaunchBarSeen() {
  useLayoutEffect(() => {
    hideLaunchBar('contribute', 'seen');
  }, []);
  return null;
}

/**
 * In a tab left open across a switch (the launch, the end of its week), moves the bar on at that minute, as a fresh
 * page load would: the head script picks once per load. Renders nothing.
 */
export function LaunchBarClock() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const at = nextLaunchBarSwitch(Date.now());
      if (at === null) return;
      // setTimeout holds at most ~24.8 days; a longer wait just checks again.
      timer = setTimeout(
        () => {
          const now = Date.now();
          if (now >= at) {
            const bar = launchBarAt(now);
            const off = launchBarOff(bar, window.location.pathname);
            document.documentElement.setAttribute(LAUNCH_BAR_ATTR, off ? LAUNCH_BAR_OFF : bar);
          }
          schedule();
        },
        Math.min(at - Date.now() + 1000, 2 ** 31 - 1),
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return null;
}
