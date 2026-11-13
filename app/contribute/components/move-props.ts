import type { ReactNode } from 'react';

import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import type { ContributionMoves, Move } from '@/lib/contribute/contribution-moves';
import type { ActionId } from '@/lib/contribute/hard-stop';
import type { OrgAccess } from '@/lib/contribute/org-access';

/** What every move card reads: its move, the contribution's model, the sessions it is about, and what rides under it. */
export type CardProps = {
  move: Move;
  model: ContributionMoves;
  /** The contribution's first attempt; undefined for a run whose first attempt is not known. */
  first?: ContributeAttemptDetail;
  /** The run the card is about: the one under way, or the one shown. */
  run?: ContributeAttemptDetail;
  view: ContributeView;
  now: Date;
  blocked: ReadonlySet<ActionId>;
  orgAccess: OrgAccess;
  /** Under the card: the proof's line, "Start a run anyway", Also waiting. */
  rider: ReactNode;
};
