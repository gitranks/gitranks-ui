'use client';

import { Panel } from './primitives';
import { SetListEditor } from './set-list-editor';
import { FallbackChoice, useSetWrite } from './set-section';
import { StackTargets } from './stack-targets';
import type { ContributeSet, ContributeSetListMode } from '@/lib/contribute/contribute.types';

/**
 * The current mode's list, changed in place: the add input and its repos, the libraries worked out from a stack, and
 * what happens when the list has nothing ready. Every change is saved as it is made.
 */
export function SetListScreen({
  set: loaded,
  mode,
  now,
}: {
  set: ContributeSet;
  mode: ContributeSetListMode;
  now?: Date;
}) {
  const { set, write, setFeedback, feedbackDialog } = useSetWrite(loaded);
  return (
    <>
      <Panel id="list">
        <SetListEditor
          key={mode}
          set={set}
          mode={mode}
          write={write}
          onFeedback={setFeedback}
          now={now}
          divided={false}
        />
        {mode === 'STACK' ? <StackTargets set={set} write={write} onFeedback={setFeedback} now={now} /> : null}
        <FallbackChoice set={set} mode={mode} write={write} />
      </Panel>
      {feedbackDialog}
    </>
  );
}
