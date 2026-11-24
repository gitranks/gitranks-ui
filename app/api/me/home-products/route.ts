import { NextResponse } from 'next/server';

import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { loadHomeProducts } from '@/app/components/landing/products-block.data';
import type { HomeProductsAnswer } from '@/app/components/landing/products-block-read';
import { auth } from '@/auth';

/**
 * The home block's two cards for the signed-in person, asked by the browser once the page is up: `{ products }`, null
 * signed out (without asking the API) and on any failure. Never kept: the cards say what is there today.
 */
export const GET = auth(async function GET(req: AuthRequest) {
  const viewer = req.auth && !req.auth.error ? req.auth.user.githubLogin : undefined;
  const answer: HomeProductsAnswer = { products: viewer ? await loadHomeProducts(viewer) : null };
  return NextResponse.json(answer, { headers: { 'Cache-Control': 'private, no-store' } });
});
