#!/bin/sh
#
# Caps the pages Next.js writes to its page cache at runtime.
#
# Next keeps every page it renders on demand under .next/server/app (the .html, .meta and .rsc
# files and the .segments folder), with no eviction. A new container starts from the image and
# drops them, but between deploys they pile up for as long as visitors and crawlers keep finding
# new URLs. Every INTERVAL seconds this keeps the newest MAX_PAGES runtime pages and deletes the
# rest, oldest first. A deleted page is a cache miss: Next renders it again on its next visit,
# exactly as after a deploy.
#
# Runtime pages are those written after the image was built: newer than server.js, which the
# build writes last. Pages prerendered at build time are never touched.

CACHE_DIR="${PAGE_CACHE_DIR:-/app/.next/server/app}"
BUILD_MARKER="${PAGE_CACHE_BUILD_MARKER:-/app/server.js}"
MAX_PAGES="${PAGE_CACHE_MAX_PAGES:-20000}"
INTERVAL="${PAGE_CACHE_INTERVAL:-3600}" # seconds; 0 runs one pass and exits

log() {
  echo "$(date) [page-cache-cleaner] $*"
}

prune() {
  if [ ! -d "$CACHE_DIR" ] || [ ! -e "$BUILD_MARKER" ]; then
    log "Missing $CACHE_DIR or $BUILD_MARKER, nothing to do"
    return
  fi

  LIST=$(mktemp) || return
  # One "<mtime> <path>" line per runtime page, oldest first. Page paths can contain spaces.
  find "$CACHE_DIR" -type f -name '*.html' -newer "$BUILD_MARKER" -exec stat -c '%Y %n' {} + 2>/dev/null |
    sort -n >"$LIST"
  COUNT=$(wc -l <"$LIST" | tr -d ' ')
  EXTRA=$((COUNT - MAX_PAGES))

  if [ "$EXTRA" -gt 0 ]; then
    head -n "$EXTRA" "$LIST" | cut -d ' ' -f 2- | while IFS= read -r HTML; do
      PAGE="${HTML%.html}"
      rm -rf -- "$HTML" "$PAGE.meta" "$PAGE.rsc" "$PAGE.segments"
    done
    log "Found $COUNT runtime pages, removed the oldest $EXTRA (cap $MAX_PAGES)"
  else
    log "Found $COUNT runtime pages (cap $MAX_PAGES)"
  fi

  rm -f "$LIST"
}

log "Starting. Dir: $CACHE_DIR, cap: $MAX_PAGES runtime pages, interval: ${INTERVAL}s"

while true; do
  prune
  [ "$INTERVAL" -eq 0 ] && exit 0
  sleep "$INTERVAL"
done
