import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const tagName = request.nextUrl.searchParams.get('tag');

  if (tagName) {
    revalidateTag(tagName, 'max');
    return Response.json({ revalidated: true });
  }

  return Response.json({ revalidated: false, message: 'Missing tag to revalidate' });
}
