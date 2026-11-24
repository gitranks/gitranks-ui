import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AnswersLive } from '@/components/learn/walkthrough/answers-view';
import { githubLoginOf } from '@/lib/learn/learn-path';
import { learnAnswersMetadata } from '@/lib/learn/seo/walkthrough';
import { fixRefOf } from '@/lib/learn/walkthrough';
import { loadWalkthroughAnswers } from '@/lib/learn/walkthrough.data';

/**
 * A person's answers to a fix's walkthrough (page 13), open to everyone, never indexed (search engines go on to the
 * walkthrough). The page is the same for everyone, read with no session and cached under the fix's tag; the fixer's own
 * answers, shared or not, and a reader's side are read in the browser. The proxy asks the address first: nothing there
 * is a real 404, another spelling a redirect.
 */
export const instant = false;

type Params = PageProps<'/learn/fixes/[owner]/[repo]/[number]/walkthrough/by/[login]'>['params'];

async function readOf(params: Params) {
  const { owner, repo, number, login: raw } = await params;
  const pr = fixRefOf(owner, repo, number);
  const login = githubLoginOf(raw);
  return { pr, login, answers: pr && login ? await loadWalkthroughAnswers(pr, login) : null };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { login, answers } = await readOf(params);
  return learnAnswersMetadata(answers?.walkthrough ?? null, answers?.login ?? login ?? '');
}

export default async function AnswersPage({ params }: { params: Params }) {
  const { pr, login, answers } = await readOf(params);
  if (!pr || !login) notFound();
  return <AnswersLive pr={pr} login={login} initial={answers} />;
}
