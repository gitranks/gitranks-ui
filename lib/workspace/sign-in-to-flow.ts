import { signIn } from 'next-auth/react';

import { flowWayBackHereOf, withFlowWayBack } from './flow-way-back';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';

/**
 * GitHub's sign-in, back to the flow's address `path` (not to the page the button is on), with the way back the
 * browser's address carries now: a visitor's button on the first step names the step it opens.
 */
export function signInToFlow(path: string): Promise<unknown> {
  return signIn(IDENTITY_PROVIDER, { redirectTo: withFlowWayBack(path, flowWayBackHereOf()) });
}
