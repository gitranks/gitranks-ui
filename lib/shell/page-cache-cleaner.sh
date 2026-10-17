#!/bin/sh
#
# Caps the pages Next.js writes to its page cache at runtime.
#
# Next keeps every page it renders on demand under .next/server/app (the .html and .meta files,
# the .segments folder and sometimes a .rsc file), with no eviction. A new container starts from
# the image and drops them, but between deploys they pile up for as long as visitors and crawlers
# keep finding new URLs. Every INTERVAL seconds this keeps the newest MAX_PAGES runtime pages and
# deletes the rest, oldest first. A deleted page is a cache miss: Next renders it again on its next
# visit, as after a deploy.
#
# Runtime pages are those written after the image was built: newer than BUILD_MARKER, a file the
# Dockerfile touches after copying the build in. Pages prerendered at build time are never touched.

CACHE_DIR="${PAGE_CACHE_DIR:-/app/.next/server/app}"
BUILD_MARKER="${PAGE_CACHE_BUILD_MARKER:-/app/.next/page-cache-build-marker}"
MAX_PAGES="${PAGE_CACHE_MAX_PAGES:-20000}"
INTERVAL="${PAGE_CACHE_INTERVAL:-3600}" # seconds; 0 runs one pass and exits

# Cache file names come from decoded URL paths, so a request for `%0A` leaves a name with a
# newline in it. Such entries are deleted outright and kept out of the line-based listing below.
NL='
'

log() {
  echo "$(date) [page-cache-cleaner] $*"
}

for SETTING in "MAX_PAGES=$MAX_PAGES" "INTERVAL=$INTERVAL"; do
  # Digits only, and no leading zero: the shell would read 010 as octal and fail on 08.
  case ${SETTING#*=} in
    '' | *[!0-9]* | 0[0-9]*)
      log "PAGE_CACHE_${SETTING%%=*} must be a whole number, got '${SETTING#*=}'; not starting"
      exit 1
      ;;
  esac
done

prune() {
  if [ ! -d "$CACHE_DIR" ] || [ ! -e "$BUILD_MARKER" ]; then
    log "Missing $CACHE_DIR or $BUILD_MARKER, nothing to do"
    return
  fi

  find "$CACHE_DIR" -depth -newer "$BUILD_MARKER" -name "*$NL*" -exec rm -rf -- {} + 2>/dev/null

  LIST=$(mktemp) || {
    log "Cannot create a temporary file, skipping this pass"
    return
  }
  # One "<mtime> <path>" line per runtime page, oldest first. Page paths can contain spaces.
  find "$CACHE_DIR" -type f -name '*.html' ! -path "*$NL*" -newer "$BUILD_MARKER" -exec stat -c '%Y %n' {} + 2>/dev/null |
    sort -n >"$LIST"
  COUNT=$(wc -l <"$LIST" | tr -d ' ')
  EXTRA=$((COUNT - MAX_PAGES))

  if [ "$EXTRA" -gt 0 ]; then
    head -n "$EXTRA" "$LIST" | cut -d ' ' -f 2- | while IFS= read -r HTML; do
      # Only ever a cache page inside the cache directory.
      case $HTML in "$CACHE_DIR"/*.html) ;; *) continue ;; esac
      [ -f "$HTML" ] || continue
      PAGE="${HTML%.html}"
      rm -rf -- "$HTML" "$PAGE.meta" "$PAGE.rsc" "$PAGE.segments"
    done
    # Folders left empty by the pages above (runtime ones only: they are newer than the marker).
    # One rmdir per folder, so a parent emptied by its child's removal goes in the same pass.
    find "$CACHE_DIR" -depth -mindepth 1 -type d -empty -newer "$BUILD_MARKER" -exec rmdir -- {} \; 2>/dev/null
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
