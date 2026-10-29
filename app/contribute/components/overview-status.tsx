import { notFound } from 'next/navigation';

import { ContributeNotices } from './contribute-notices';
import { CycleSummary } from './cycle-summary';
import { loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeView } from '@/lib/contribute/contribute.types';
import { claudeKeyOf, contributeNoticesOf } from '@/lib/contribute/contribute-state';

/** Where the user stands, above the pitch: nothing until they connected a key (the pitch asks for one). */
export async function OverviewStatus() {
  const view = await loadContribute();
  if (!view) notFound();
  return <OverviewStatusView view={view} />;
}

export function OverviewStatusView({ view, now }: { view: ContributeView; now?: Date }) {
  if (!claudeKeyOf(view)) return null;

  return (
    <div className="flex flex-col gap-3">
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <CycleSummary view={view} now={now} />
    </div>
  );
}
