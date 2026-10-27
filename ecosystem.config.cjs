// PM2 process file for the VPS (see deploy/README.md).
//
// One app process ("zina", port 3000) in fork mode: the login rate limiter keeps its counters in
// memory, so there must never be two live copies sharing traffic. "zina-standby" (port 3001) only
// runs for a few seconds during a deploy: it serves the new release while "zina" restarts, and
// Nginx falls back to it (upstream `backup`), so a deploy has no downtime.
//
// The release folder is resolved here, when PM2 reads this file, so a restart always runs the
// release that `current` points to at that moment (or RELEASE_DIR, set by release.sh).

const fs = require("node:fs");
const path = require("node:path");
const { readEnv } = require("./deploy/scripts/env.cjs");

const APP_ROOT = process.env.APP_ROOT || "/var/www/zina";
const shared = path.join(APP_ROOT, "shared");
const release = process.env.RELEASE_DIR || fs.realpathSync(path.join(APP_ROOT, "current"));

const env = readEnv(path.join(shared, ".env"));

function app(name, port) {
  return {
    name,
    cwd: release,
    script: path.join(release, "server.js"),
    exec_mode: "fork",
    instances: 1,
    max_memory_restart: "700M",
    kill_timeout: 10000,
    // Next's standalone server answers as soon as it listens; health checks do the rest.
    listen_timeout: 15000,
    out_file: path.join(shared, "logs", `${name}.out.log`),
    error_file: path.join(shared, "logs", `${name}.err.log`),
    merge_logs: true,
    time: true,
    env: {
      ...env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      RELEASE_ID: path.basename(release),
    },
  };
}

module.exports = { apps: [app("zina", 3000), app("zina-standby", 3001)] };
