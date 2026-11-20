import { HostedLevelPicker } from './hosted-level-picker';
import type { ContributeScheduleCounts, ContributeView } from '@/lib/workspace/contribute.types';
import { isPaused, settingsOf } from '@/lib/workspace/contribute-state';
import { nextIssueLineOf } from '@/lib/workspace/hosted-level';

/**
 * The hosted agent's control (W1 §9.3's slot): how much it does by itself, one of three levels, with when it starts its
 * next issue by itself. Drawn with a key and its settings; nothing otherwise (the own agent alone has no autopilot: it
 * acts on the hosted agent's changes only).
 */
export function HostedAgentControl({
  view,
  counts,
  now,
}: {
  view: ContributeView;
  /** The pull requests open or on their way, against the limit; `undefined` when not answered. */
  counts?: ContributeScheduleCounts;
  now?: Date;
}) {
  const { contributor } = view;
  const settings = settingsOf(view);
  if (!contributor || !settings) return null;
  // Said under whichever card that starts issues by itself is selected, so a pick shows it before the page reads again.
  const nextIssue = nextIssueLineOf(
    'NEXT',
    {
      paused: isPaused(view),
      spend: contributor.spend,
      counts,
      settings,
      limits: contributor.limits,
    },
    now,
  );
  // `#hosted-level`, where the old `#pause` link goes.
  return (
    <div id="hosted-level" className="scroll-mt-20">
      <HostedLevelPicker
        level={settings.hostedLevel}
        autopilot={contributor.autopilot}
        login={contributor.login}
        nextIssue={nextIssue}
      />
    </div>
  );
}
