import type { ReactNode } from 'react';

import { BarCount, BarItem } from '@/components/tabs/bar-item';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** The door's click source: the tabs', as the Learn tab it replaces had, so its clicks are counted as before. */
const DOOR_MARK = contributeSource('workspace_tab');

/** The door's count: the lessons due, as Learn's bar counts them for "Review"; nothing with none due. */
export function LearnDoorDue({ due }: { due: number }) {
  return <BarCount count={due} label={due === 1 ? 'lesson due' : 'lessons due'} />;
}

/**
 * The door into Learn at the workspace bar's right edge, for a person who uses Learn: a quiet outlined "Learn" that opens
 * Learn home. Its count is read later, in the browser, so the door keeps one width from the start, the word with room
 * for one count, and the count fills that room when it arrives; "Learn" never moves.
 */
export function LearnDoor({ count }: { count?: ReactNode }) {
  return (
    <BarItem
      href={WORKSPACE_PATHS.learnHome}
      current={false}
      item="learn-door"
      data={DOOR_MARK}
      countSlot={
        <span className="inline-flex min-w-7 items-center" data-learn-door-count="">
          {count}
        </span>
      }
    >
      Learn
    </BarItem>
  );
}
