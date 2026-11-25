import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { ContributeNoProfileOf } from '@/components/workspace/setting-up';
import { ONBOARDING_STEPS } from '@/lib/learn/onboarding';
import type { ContributeSetupState } from '@/lib/workspace/contribute.types';

/**
 * Learn's setup for a signed-in account GitRanks has no profile of yet, by where its setup stands: the setting-up panel
 * while its first read is on its way (the page reads itself again, and the onboarding takes its place once the
 * profile is there), "Try again" once that read failed, the line that GitRanks does not read the account when it does
 * not. In the onboarding's frame, on its first step, so the onboarding that follows moves nothing.
 */
export function OnboardingNoProfile({ state }: { state: ContributeSetupState }) {
  return (
    <FlowFrame side="learn" steps={ONBOARDING_STEPS} step={1}>
      <ContributeNoProfileOf state={state} product="Learn" />
    </FlowFrame>
  );
}
