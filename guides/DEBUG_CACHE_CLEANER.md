# Page Cache Cleaner

`lib/shell/page-cache-cleaner.sh` runs in the background of the container, next to `node server.js`
(see the `CMD` in the `Dockerfile`). In the commands below, `<container>` is the name of the running
app container.

## What it does

Next.js keeps every page it renders on demand in its page cache under `/app/.next/server/app`, with
no eviction. Each page there is a `.html` file, a `.meta` file, a `.segments` folder and sometimes a
`.rsc` file. A new container starts from the image and drops them. Between deploys, though, they keep
piling up for as long as visitors and crawlers find new URLs: ranking pages by country, language and
page number, mostly. A cached page is about 450 KB on disk.

Once an hour the script:

- counts the **runtime pages**: those newer than `/app/.next/page-cache-build-marker`, a file the
  `Dockerfile` touches after copying the build in. Pages prerendered at build time are not
  counted, unless Next renders one again at runtime: the new copy is a runtime page like any other;
- keeps the newest 8,000 (about 3.5 GB) and deletes the rest, oldest first, each page as a whole;
- removes the folders those deletions left empty;
- deletes any entry whose name contains a newline. A request for an encoded newline (`%0A`) can
  create one, and the line-based listing can't parse it.

A deleted page is a cache miss. Next renders it again on its next visit, just as it would after a
deploy.

Settings, all optional environment variables. The two numbers must be whole numbers without a
leading zero; otherwise the script logs why and does not start.

| Variable | Default | Meaning |
| --- | --- | --- |
| `PAGE_CACHE_MAX_PAGES` | `8000` | Runtime pages to keep |
| `PAGE_CACHE_INTERVAL` | `3600` | Seconds between passes; `0` runs one pass and exits |
| `PAGE_CACHE_DIR` | `/app/.next/server/app` | The page cache |
| `PAGE_CACHE_BUILD_MARKER` | `/app/.next/page-cache-build-marker` | Anything newer counts as written at runtime |

## Checking it

```bash
# The process
docker exec <container> ps -o pid,args | grep page-cache-cleaner

# Its log lines, one per pass
docker logs <container> 2>&1 | grep "page-cache-cleaner" | tail -5

# How many runtime pages there are right now
docker exec <container> sh -c 'find /app/.next/server/app -type f -name "*.html" -newer /app/.next/page-cache-build-marker | wc -l'

# One pass now, without waiting for the hour
docker exec -e PAGE_CACHE_INTERVAL=0 <container> /app/lib/shell/page-cache-cleaner.sh
```

Expected log output:

```
Sat Oct 17 12:00:00 UTC 2026 [page-cache-cleaner] Starting. Dir: /app/.next/server/app, cap: 8000 runtime pages, interval: 3600s
Sat Oct 17 12:00:00 UTC 2026 [page-cache-cleaner] Found 47 runtime pages (cap 8000)
Sat Oct 24 12:00:00 UTC 2026 [page-cache-cleaner] Found 8113 runtime pages, removed the oldest 113 (cap 8000)
```

What other messages mean:

- `Missing /app/.next/server/app or /app/.next/page-cache-build-marker, nothing to do`: the build no
  longer puts the page cache or the marker where the script expects them. Check the `Dockerfile`.
- `PAGE_CACHE_MAX_PAGES must be a whole number, got '…'; not starting`: fix the variable and restart.
- `Cannot create a temporary file, skipping this pass`: `/tmp` isn't writable in the container.

## The other runtime caches

Next writes two more caches at runtime, under `/app/.next/cache`. The script leaves both alone:

- `images`: optimized images. Next caps this one itself with `images.maximumDiskCacheSize` in
  `next.config.ts` and deletes the least recently used first. The cap counts image bytes only;
  each entry is also a folder, so `du` shows about 1.5 times the cap.
- `fetch-cache`: the responses of `fetch` calls that ask to be cached (`next.revalidate`,
  `cache: 'force-cache'`). Next never evicts it. The cache key is the whole request: URL, method,
  every header and the body. A fetch whose key changes per call (a per-login URL, a freshly signed
  token in a header) writes a new entry each time and never reads one back. Such fetches pass no
  cache option at all: the avatar route and the insight requests are two of them.

```bash
# Size of all three
docker exec <container> du -sh /app/.next/server/app /app/.next/cache/images /app/.next/cache/fetch-cache
```
