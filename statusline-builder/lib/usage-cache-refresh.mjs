#!/usr/bin/env node
// Invoked as a detached child by spawnBackgroundRefresh. Fetches fresh
// usage data and writes to the cache file passed as argv[2].
import { getOauthToken, fetchUsage, writeUsageCache } from "./usage-cache.mjs";

const cachePath = process.argv[2];
if (!cachePath) process.exit(0);

(async () => {
  const token = getOauthToken();
  if (!token) process.exit(0);
  const data = await fetchUsage(token);
  if (data) writeUsageCache(cachePath, data);
})();
