# Page Cache Cleaner

`lib/shell/page-cache-cleaner.sh` runs in the background of the container, next to `node server.js`
(see the `CMD` in the `Dockerfile`).

## What it does

Next.js keeps every page it renders on demand in its page cache under `/app/.next/server/app`, with
no eviction. Each page there is a `.html`, a `.meta`, sometimes a `.rsc`, and a `.segments` folder.
A new container starts from the image and drops them. Between deploys, though, they keep piling up
for as long as visitors and crawlers find new URLs: ranking pages by country, language and page
number, mostly. A cached page is about 400 KB.

Once an hour the script counts the **runtime pages**: those written after the image was built, so
newer than `/app/server.js`. It keeps the newest 20,000 (about 8–9 GB) and deletes the rest, oldest
first. Pages prerendered at build time are never touched.

A deleted page is a cache miss. Next renders it again on its next visit, just as it would after a
deploy, so deleting is always safe.

Settings, all optional environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PAGE_CACHE_MAX_PAGES` | `20000` | Runtime pages to keep |
| `PAGE_CACHE_INTERVAL` | `3600` | Seconds between passes; `0` runs one pass and exits |
| `PAGE_CACHE_DIR` | `/app/.next/server/app` | The page cache |
| `PAGE_CACHE_BUILD_MARKER` | `/app/server.js` | A file from the build; anything newer counts as written at runtime |

## Checking it

```bash
# The process
docker exec gitranks-ui ps -o pid,args | grep page-cache-cleaner

# Its log lines, one per pass
docker logs gitranks-ui 2>&1 | grep "page-cache-cleaner" | tail -5

# How many runtime pages there are right now
docker exec gitranks-ui sh -c 'find /app/.next/server/app -type f -name "*.html" -newer /app/server.js | wc -l'

# One pass now, without waiting for the hour
docker exec -e PAGE_CACHE_INTERVAL=0 gitranks-ui /app/lib/shell/page-cache-cleaner.sh
```

Expected log output:

```
Sat Oct 17 12:00:00 UTC 2026 [page-cache-cleaner] Starting. Dir: /app/.next/server/app, cap: 20000 runtime pages, interval: 3600s
Sat Oct 17 12:00:00 UTC 2026 [page-cache-cleaner] Found 47 runtime pages (cap 20000)
Sat Oct 24 12:00:00 UTC 2026 [page-cache-cleaner] Found 20113 runtime pages, removed the oldest 113 (cap 20000)
```

The message `Missing /app/.next/server/app or /app/server.js, nothing to do` means the paths changed:
check where the standalone output puts the page cache and `server.js`.
