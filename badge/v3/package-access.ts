/**
 * What a package's badge routes answer while packages are not open to everyone. Who may see them is decided per
 * request, so no answer may be kept by the edge or any shared cache: an edge copy of a shown answer would be served to
 * everyone, and a kept not-found answer would outlive the opening.
 */

/** The only cache rule of a package badge answer until packages are open to everyone. */
export const PACKAGE_PREVIEW_CACHE_CONTROL = 'private, no-store';

const PRIVATE = { 'Cache-Control': PACKAGE_PREVIEW_CACHE_CONTROL };

/** A badge image for a visitor packages are hidden from: the image routes' not-found answer, kept by nobody. */
export const hiddenPackageImage = () =>
  new Response('Badge not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE },
  });

/** A package's builder facts for a visitor packages are hidden from: the facts route's not-found answer, kept by nobody. */
export const hiddenPackageFacts = () => Response.json({ error: 'Not found' }, { status: 404, headers: PRIVATE });

/** The same answer, kept by nobody: `Cache-Control: private, no-store`, and no other cache header. */
export function privateAnswer(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.delete('Cloudflare-CDN-Cache-Control');
  headers.delete('CDN-Cache-Control');
  headers.delete('Surrogate-Control');
  headers.set('Cache-Control', PACKAGE_PREVIEW_CACHE_CONTROL);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
