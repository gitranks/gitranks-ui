// The page cache (`cacheHandler` in next.config.ts): Next's own file-system cache, except that the pages of one
// developer, organization, repository or post are kept in memory only.
//
// Those routes render each URL whole before answering (their real 404 and 308 come from that), and Next would then
// write every URL a visitor or crawler opens to `.next/server/route-cache`, a few hundred KB each. In memory they share
// Next's own size-bounded LRU (`cacheMaxMemorySize`, 50 MB by default) with the rest of the page cache, and a restart
// drops them, so a page never outlives the in-memory tag expiry that a refresh relies on. Reads go through Next's code
// unchanged, so an expired tag still makes the page render again.
//
// Plain CommonJS: Next loads this file by path at run time, outside the app bundle.
const FileSystemCache = require('next/dist/server/lib/incremental-cache/file-system-cache').default;

/** The request path inside a response key: `/route-cache/APP_PAGE/<route hash>/$/profile/x` → `/profile/x`. */
function pathnameOf(key) {
  const marker = typeof key === 'string' ? key.indexOf('/$/') : -1;
  return marker === -1 ? null : key.slice(marker + 2);
}

const MEMORY_ONLY = /^\/(?:profile|org|repo|insights)\//;

/** Whether the entry for `key` stays in memory: a page of one of those routes. */
function isMemoryOnly(key) {
  const pathname = pathnameOf(key);
  return pathname !== null && MEMORY_ONLY.test(pathname);
}

class PageCacheHandler extends FileSystemCache {
  constructor(ctx) {
    super(ctx);
    // The same cache without the disk: its memory store is the one the parent uses (a static of the class).
    this.memoryOnly = new FileSystemCache({ ...ctx, flushToDisk: false });
  }

  async set(key, data, ctx) {
    return isMemoryOnly(key) ? this.memoryOnly.set(key, data, ctx) : super.set(key, data, ctx);
  }
}

module.exports = PageCacheHandler;
module.exports.isMemoryOnly = isMemoryOnly;
