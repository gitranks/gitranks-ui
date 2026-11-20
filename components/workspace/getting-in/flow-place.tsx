import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import type { FlowPlace } from '@/lib/workspace/getting-in';

/** The panels a step shows in its frame in place of itself: its side's setting-up and no-profile panels. */
export type FlowPanels = { settingUp: ReactNode; noProfile: ReactNode };

/**
 * A step's place when it is not the step itself: the redirect and the 404 happen here, a panel is returned to draw in
 * the frame. Null for the step (with its sign-in card, or saving the address's answer first): the page draws it.
 */
export function flowPanelOf(place: FlowPlace, panels: FlowPanels): ReactNode | null {
  switch (place.kind) {
    case 'redirect':
      return redirect(place.to);
    case 'not-found':
      return notFound();
    case 'setting-up':
      return panels.settingUp;
    case 'no-profile':
      return panels.noProfile;
    default:
      return null;
  }
}
