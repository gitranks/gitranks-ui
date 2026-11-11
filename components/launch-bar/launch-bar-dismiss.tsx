'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { XIcon } from 'lucide-react';
import { useEffect } from 'react';

import { hideLaunchBar } from './launch-bar.consts';
import { Button } from '@/components/ui/button';

/** The bar's X: hides it in this browser for good. A 44px target on phones. */
export function LaunchBarDismiss() {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Hide this announcement"
      className="text-muted-foreground max-md:-mr-3.5 max-md:size-11"
      onClick={() => {
        sendGAEvent('event', 'launch_bar_dismiss');
        hideLaunchBar('dismissed');
      }}
    >
      <XIcon />
    </Button>
  );
}

/** On Contribute's pages: this browser has seen Contribute, so the bar stays hidden from now on. Renders nothing. */
export function LaunchBarSeen() {
  useEffect(() => {
    hideLaunchBar('seen');
  }, []);
  return null;
}
