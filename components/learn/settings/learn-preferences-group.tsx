import { GraduationCap } from 'lucide-react';

import { SetupRowFollow } from './setup-row-follow';
import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { LEARN_PREFERENCES_ID } from '@/lib/learn/paths';
import { LANGUAGES_AND_LEVEL_TITLE, LEARN_PREFERENCES_TITLE, SETUP_ROW_PATH, setupRowOf } from '@/lib/learn/settings';
import type { LearnSetupRead } from '@/lib/learn/setup';

/**
 * Settings' "Learn preferences" (page 23): one row, "Languages and level", with the setup in a line and a button that
 * opens Set up Learn. Our guess waiting for the person is marked and its button says to check it; while we read their
 * profile, the row says so, and follows Learn's bar: when the bar finds our guess in, the page is read again
 * (`SetupRowFollow`). `setup` null: none yet; undefined: the read failed, and the row says so.
 */
export function LearnPreferencesGroup({ setup }: { setup: LearnSetupRead | null | undefined }) {
  const row = setupRowOf(setup);
  return (
    <SettingsGroup id={LEARN_PREFERENCES_ID} title={LEARN_PREFERENCES_TITLE}>
      <SettingsList>
        <SettingsRow
          icon={GraduationCap}
          href={SETUP_ROW_PATH}
          cta={row.cta}
          title={
            <>
              {LANGUAGES_AND_LEVEL_TITLE}
              {row.guess ? (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground">
                  Our guess
                </span>
              ) : null}
            </>
          }
          value={row.value}
          data={{ 'data-row': 'learn-setup', 'data-learn-setup': row.kind }}
        />
      </SettingsList>
      {row.kind === 'working' || row.kind === 'none' ? <SetupRowFollow /> : null}
    </SettingsGroup>
  );
}
