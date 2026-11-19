import { Activity } from 'lucide-react';

import { Pill } from '@/components/pill/pill';
import { AutopilotSection } from '@/components/workspace/autopilot-section';
import { PauseButton } from '@/components/workspace/pause-button';
import { SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { claudeKeyOf, isPaused, settingsOf } from '@/lib/workspace/contribute-state';
import { relativeLabel } from '@/lib/workspace/format';

/** Where new hosted attempts stand: paused by the user, active on a working key, or waiting on the key. */
export function hostedStatusOf(view: ContributeView, now?: Date) {
  const spend = view.contributor?.spend;
  if (isPaused(view)) {
    return { label: 'Paused', tone: 'neutral' as const, text: 'No new attempt starts until you resume.' };
  }
  if (claudeKeyOf(view)?.state !== 'VALID') {
    return { label: 'Waiting', tone: 'amber' as const, text: 'No new attempt starts until your key works again.' };
  }
  return {
    label: 'Active',
    tone: 'green' as const,
    text: !spend
      ? 'The first attempt starts as your limits allow.'
      : spend.nextAttemptAt
        ? `Next attempt ${relativeLabel(spend.nextAttemptAt, now)}.`
        : 'No attempt can start under your limits.',
  };
}

/**
 * The slot for how much the hosted agent does by itself (W1 §9.3). Until the three levels fill it, it holds today's two
 * controls: the status line with Pause or Resume (`#pause`), and autopilot (`#autopilot`). Nothing without a
 * contributor.
 */
export function HostedAgentControl({ view, now }: { view: ContributeView; now?: Date }) {
  const { contributor } = view;
  if (!contributor) return null;
  const status = hostedStatusOf(view, now);
  const settings = settingsOf(view);
  return (
    <SettingsList>
      <SettingsRow
        id="pause"
        icon={Activity}
        title={
          <>
            New attempts
            <Pill tone={status.tone}>{status.label}</Pill>
          </>
        }
        value={status.text}
        data={{ 'data-hosted-status': status.label.toLowerCase() }}
      >
        <PauseButton paused={isPaused(view)} />
      </SettingsRow>
      <AutopilotSection
        autopilot={contributor.autopilot}
        login={contributor.login}
        enabled={settings?.autopilot ?? false}
        canSave={!!settings}
      />
    </SettingsList>
  );
}
