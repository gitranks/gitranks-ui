# Debugging Profile Cache Cleaner

## How to Verify It's Running

### 1. Check if the process is running inside the container

SSH to your server and run:

```bash
docker exec gitranks-ui ps aux | grep profile-cache-cleaner
```

You should see the script process running.

### 2. View Docker Logs

The script logs to stdout/stderr, which Docker captures. View logs with:

```bash
# View all logs
docker logs gitranks-ui

# Follow logs in real-time
docker logs -f gitranks-ui

# View only the last 100 lines
docker logs --tail 100 gitranks-ui

# Filter logs for cache cleaner messages
docker logs gitranks-ui 2>&1 | grep "profile-cache-cleaner"
```

### 3. Verify It Runs Every 10 Minutes

The script logs every time it runs (every 600 seconds). Check timestamps:

```bash
docker logs gitranks-ui 2>&1 | grep "profile-cache-cleaner" | tail -20
```

You should see log entries approximately every 10 minutes with timestamps like:
```
Mon Jan 20 10:00:00 UTC 2025 [profile-cache-cleaner] Found 15000 profile dirs
Mon Jan 20 10:10:00 UTC 2025 [profile-cache-cleaner] Found 15000 profile dirs
Mon Jan 20 10:20:00 UTC 2025 [profile-cache-cleaner] Found 15000 profile dirs
```

### 4. Check Script Execution Directly

Execute the script manually inside the container to test:

```bash
docker exec gitranks-ui /app/lib/shell/profile-cache-cleaner.sh
```

(Note: This will run in foreground - press Ctrl+C to stop)

### 5. Verify the Script File Exists and is Executable

```bash
docker exec gitranks-ui ls -la /app/lib/shell/profile-cache-cleaner.sh
docker exec gitranks-ui test -x /app/lib/shell/profile-cache-cleaner.sh && echo "Executable" || echo "Not executable"
```

### 6. Check if Profile Directory Exists

```bash
docker exec gitranks-ui ls -la /app/.next/server/app/profile
docker exec gitranks-ui ls -d /app/.next/server/app/profile/*/ 2>/dev/null | wc -l
```

## Expected Log Output

When working correctly, you should see logs like:

```
Starting profile cache cleaner. Dir: /app/.next/server/app/profile, max dirs: 30000, interval: 600s
Mon Jan 20 10:00:00 UTC 2025 [profile-cache-cleaner] Found 15000 profile dirs
Mon Jan 20 10:10:00 UTC 2025 [profile-cache-cleaner] Found 15200 profile dirs
Mon Jan 20 10:20:00 UTC 2025 [profile-cache-cleaner] Found 15100 profile dirs
```

If the directory doesn't exist yet:
```
Mon Jan 20 10:00:00 UTC 2025 [profile-cache-cleaner] Directory /app/.next/server/app/profile does not exist
```

If cleanup is needed:
```
Mon Jan 20 10:00:00 UTC 2025 [profile-cache-cleaner] Found 35000 profile dirs
Mon Jan 20 10:00:00 UTC 2025 [profile-cache-cleaner] Need to remove 5000 oldest dirs
  removing /app/.next/server/app/profile/abc123/
  removing /app/.next/server/app/profile/def456/
  ...
```

## Troubleshooting

### Script not running?
1. Check container logs: `docker logs gitranks-ui`
2. Check if process exists: `docker exec gitranks-ui ps aux | grep profile`
3. Verify script permissions: `docker exec gitranks-ui ls -la /app/lib/shell/profile-cache-cleaner.sh`

### No logs appearing?
1. The script might be failing silently - check with: `docker exec gitranks-ui sh -c "/app/lib/shell/profile-cache-cleaner.sh"` (run manually)
2. Check if the script has proper shebang: `docker exec gitranks-ui head -1 /app/lib/shell/profile-cache-cleaner.sh`

### Script runs but no cleanup happens?
1. Check if directory exists: `docker exec gitranks-ui test -d /app/.next/server/app/profile && echo "Exists" || echo "Missing"`
2. Check current count: `docker exec gitranks-ui ls -d /app/.next/server/app/profile/*/ 2>/dev/null | wc -l`
3. Verify MAX_DIRS threshold (currently 30000) - if count is below this, no cleanup will occur

