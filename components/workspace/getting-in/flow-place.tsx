import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { ContributeNoProfileRead } from '@/components/workspace/no-profile-panel';
import { ContributeSettingUp } from '@/components/workspace/setting-up';
import type { FlowPlace } from '@/lib/workspace/getting-in';

/**
 * The panels a step shows in its frame in place of itself: its side's setting-up panel, and the one for an account
 * with no profile, which reads where its setup stands (on its way, failed with "Try again", or not read).
 */
export type FlowPanels = { settingUp: ReactNode; noProfile: ReactNode };

/** Contribute's: the account being set up (the page reads itself again until it is ready), and no profile. */
export const CONTRIBUTE_FLOW_PANELS: FlowPanels = {
  settingUp: <ContributeSettingUp />,
  noProfile: <ContributeNoProfileRead />,
};

/**
 * A step's place when it is not the step itself: the redirect and the 404 happen here, a panel is returned to draw in
 * the frame. Null for the step itself: the page draws it.
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
