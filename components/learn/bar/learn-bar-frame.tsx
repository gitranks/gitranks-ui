import 'server-only';

import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { learnOpenToEveryoneCached } from '@/lib/learn/learn-everyone-cached';

/**
 * Learn's bar on Learn's pages, with whether Learn is open to everyone (cached for minutes, so it can sit in a
 * prerendered result): a visitor's bar shows Issues only then, since Issues is not found for them before.
 */
export async function LearnBarFrame() {
  return <LearnBarLive everyone={await learnOpenToEveryoneCached()} />;
}
