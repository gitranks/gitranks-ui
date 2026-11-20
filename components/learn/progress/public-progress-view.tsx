import { notFound, redirect } from 'next/navigation';

import { PublicProgressScreen } from './public-progress-screen';
import { learnOpenToEveryone } from '@/lib/learn/learn-everyone';
import { githubLoginOf, publicProgressPath } from '@/lib/learn/learn-path';
import { lastPageOf, progressPageOf } from '@/lib/learn/progress/progress';
import { isStoredSpelling } from '@/lib/learn/public-progress/public-progress';
import { loadPublicProgress } from '@/lib/learn/public-progress/public-progress.data';
import { viewerLogin } from '@/lib/workspace/contribute.data';

type Search = Record<string, string | string[] | undefined>;

/**
 * A person's public progress page, read per request. No public record (an unknown login, no public pass, Learn not open
 * to them, an account removed) or another spelling of the login than the one stored is the 404, which the proxy has
 * answered before anything rendered; a page past the last goes to the last. A read that fails says so.
 */
export async function PublicProgressView({ login, searchParams }: { login: string; searchParams: Promise<Search> }) {
  const asked = githubLoginOf(login);
  if (!asked) notFound();
  const page = progressPageOf((await searchParams).page);
  let progress: Awaited<ReturnType<typeof loadPublicProgress>> | 'unavailable';
  try {
    progress = await loadPublicProgress(asked, page);
  } catch {
    progress = 'unavailable';
  }
  if (progress === null || (progress !== 'unavailable' && !isStoredSpelling(progress.record, asked))) notFound();
  if (progress !== 'unavailable' && page > lastPageOf(progress.total)) {
    redirect(publicProgressPath(asked, lastPageOf(progress.total)));
  }
  const [viewer, everyone] = await Promise.all([viewerLogin(), learnOpenToEveryone()]);
  return (
    <PublicProgressScreen
      login={asked}
      page={page}
      progress={progress}
      own={viewer?.toLowerCase() === asked.toLowerCase()}
      everyone={everyone}
    />
  );
}
