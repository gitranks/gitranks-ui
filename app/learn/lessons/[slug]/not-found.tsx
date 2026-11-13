import { LessonStubScreen } from '@/app/learn/components/lesson-stub';

/** An unknown or hidden lesson, or a login with no public pass on it: a real 404 that says so. */
export default function LessonNotFound() {
  return <LessonStubScreen visibility="MISSING" />;
}
