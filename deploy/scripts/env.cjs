// Reads the server's shared/.env without a shell (values may contain $, spaces or quotes).
//
//   node deploy/scripts/env.cjs KEY [file]   prints one value (exit 1 when missing or empty)
//   require("./env.cjs").readEnv(file)       all values as an object (ecosystem.config.cjs)

const fs = require("node:fs");

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    const quoted = value.match(/^(['"])([\s\S]*)\1$/);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, "");
    env[match[1]] = value;
  }
  return env;
}

module.exports = { readEnv };

if (require.main === module) {
  const [key, file = `${process.env.APP_ROOT || "/var/www/zina"}/shared/.env`] =
    process.argv.slice(2);
  const value = readEnv(file)[key];
  if (!value) process.exit(1);
  process.stdout.write(value);
}
