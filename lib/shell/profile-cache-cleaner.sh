#!/bin/sh

PROFILE_DIR="/app/.next/server/app/profile"
MAX_DIRS=30000    # change as needed
INTERVAL=600     # 10 minutes

echo "Starting profile cache cleaner. Dir: $PROFILE_DIR, max dirs: $MAX_DIRS, interval: ${INTERVAL}s"

while true; do
  if [ ! -d "$PROFILE_DIR" ]; then
    echo "$(date) [profile-cache-cleaner] Directory $PROFILE_DIR does not exist"
  else
    COUNT=$(ls -d "$PROFILE_DIR"/*/ 2>/dev/null | wc -l)
    echo "$(date) [profile-cache-cleaner] Found $COUNT profile dirs"

    if [ "$COUNT" -gt "$MAX_DIRS" ]; then
      EXTRA=$((COUNT - MAX_DIRS))
      echo "$(date) [profile-cache-cleaner] Need to remove $EXTRA oldest dirs"

      ls -dt "$PROFILE_DIR"/*/ 2>/dev/null | tail -n "$EXTRA" | while read DIR; do
        if [ -n "$DIR" ]; then
          echo "  removing $DIR"
          rm -rf "$DIR"
        fi
      done
    fi
  fi

  sleep "$INTERVAL"
done
