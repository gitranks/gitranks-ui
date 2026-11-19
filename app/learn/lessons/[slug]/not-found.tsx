import { LessonStubScreen } from '@/app/learn/components/lesson-stub';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';

/**
 * An unknown or hidden lesson, or a login with no public pass on it: a real 404 that says so, naming GitRanks Learn
 * only once Learn is open to everyone.
 */
export default async function LessonNotFound() {
  return <LessonStubScreen visibility="MISSING" named={await learnOpenToEveryone()} />;
}
