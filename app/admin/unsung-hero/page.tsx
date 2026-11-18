import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { adminCaller, readAdminBoard } from './admin-api';
import { AdminPanel } from './components/admin-panel';
import { Header } from '@/components/header/header';

// Reads the session, so it renders on request. Behind the root layout's prerendered shell, its not-found comes after the
// response started: a visitor without a session gets the real 404 from the proxy before this runs. To a signed-in
// viewer the API does not answer the board to, the page holds nothing of the board, and Next marks it noindex.
export const instant = false;

/** The board, read once per request for the metadata and the page. */
const boardOfRequest = cache(async () => readAdminBoard(await adminCaller(), 'ssr'));

export async function generateMetadata(): Promise<Metadata> {
  const answer = await boardOfRequest();
  return answer.ok ? { title: 'Unsung hero · Admin', robots: { index: false, follow: false } } : {};
}

/**
 * The owner's Unsung hero board: the shortlist, the weeks and their slots, past heroes and opt-outs. The site holds no
 * list of admins: it shows what the API answers, and is a 404 whenever the API does not answer the board (nobody signed
 * in, not an admin, or no answer at all). Opening the page changes nothing; every action is a press.
 */
export default async function UnsungHeroAdminPage() {
  const answer = await boardOfRequest();
  if (!answer.ok) {
    if (answer.failure !== 'not_found') console.error(`unsung hero admin: the board was not read (${answer.failure})`);
    notFound();
  }
  return (
    <>
      <Header />
      <AdminPanel initial={{ board: answer.data, notice: null, check: null }} />
    </>
  );
}
