'use client';

import { Ban, Layers, LayoutGrid } from 'lucide-react';

import { ModeCards } from './mode-cards';
import { PreferencesSection } from './preferences-section';
import { IgnoredList, RulesDialog } from './set-panels';
import { type SetWrite, useSetWrite } from './set-section';
import { SettingsGroup, SettingsList, SettingsRow } from './settings-rows';
import { useHashOpen } from './use-hash-open';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ContributePreferences, ContributeSet } from '@/lib/contribute/contribute.types';
import { plural } from '@/lib/contribute/set-format';
import { SETTINGS_PATHS } from '@/lib/contribute/settings-paths';
import { listSummaryOf } from '@/lib/contribute/settings-summary';

/**
 * "What you work on" on the Settings summary: the three modes, the current list's row (it opens the list's page), the
 * filters, and the ignored repos; "How we pick repos" beside the title. Reads the page again while a list is read.
 */
export function SettingsWorkGroup({
  set: loaded,
  preferences,
}: {
  set: ContributeSet;
  preferences: ContributePreferences | null;
}) {
  const { set, write, setFeedback, feedbackDialog } = useSetWrite(loaded);

  return (
    <SettingsGroup
      id="modes"
      title="What you work on"
      action={
        <RulesDialog
          className="text-sm font-medium"
          onFeedback={() => setFeedback({ topic: 'GATES', context: { mode: set.mode } })}
        />
      }
    >
      <ModeCards set={set} write={write} />
      <SettingsList>
        {set.mode === 'ALL' ? null : (
          <SettingsRow
            icon={set.mode === 'STACK' ? Layers : LayoutGrid}
            href={SETTINGS_PATHS.work}
            title={set.mode === 'STACK' ? 'Your stack' : 'Your repos'}
            value={listSummaryOf(set)}
            data={{ 'data-list-row': set.mode }}
          />
        )}
        <PreferencesSection preferences={preferences} modes />
        <IgnoredRow set={set} write={write} />
      </SettingsList>
      {feedbackDialog}
    </SettingsGroup>
  );
}

/** The ignored repos' row: how many, and Manage, which opens them with Unignore. Opens by itself at `#ignored`. */
function IgnoredRow({ set, write }: { set: ContributeSet; write: SetWrite }) {
  const [open, setOpen] = useHashOpen('ignored');
  const count = set.ignore.length;
  return (
    <SettingsRow
      id="ignored"
      icon={Ban}
      title="Ignored repos"
      value={count ? `${plural(count, 'repo')} never picked, in any mode` : 'None yet'}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" aria-label="Manage ignored repos">
            Manage
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ignored repos</DialogTitle>
            <DialogDescription>
              Never picked, in any mode, and never added back by a user, an org or your stack.
            </DialogDescription>
          </DialogHeader>
          <IgnoredList set={set} write={write} />
        </DialogContent>
      </Dialog>
    </SettingsRow>
  );
}
