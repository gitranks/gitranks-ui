import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const tagName = request.nextUrl.searchParams.get('tag');

  if (tagName) {
    // `expire: 0` instead of the 'max' profile: the caller reloads the page right after, so serving
    // stale-while-revalidate would show the pre-fetch profile again.
    revalidateTag(tagName, { expire: 0 });
    return Response.json({ revalidated: true });
  }

  return Response.json({ revalidated: false, message: 'Missing tag to revalidate' });
}
