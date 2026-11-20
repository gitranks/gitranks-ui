'use client';

import { forgetFlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { StartPageBody, type StartPageBodyProps } from '@/components/workspace/start/start-page-body';

/**
 * Your agent's body: the Start page's, in lesson mode in the flow's frame. When the agent takes the issue and the page
 * moves on to the pull request's page, the flow is left: this browser's bookmark of it is forgotten.
 */
export function IssueStepBody(props: Omit<StartPageBodyProps, 'onLeave' | 'mode' | 'frame'>) {
  return <StartPageBody {...props} mode="lesson" frame="flow" onLeave={() => forgetFlowBookmark('learn')} />;
}
