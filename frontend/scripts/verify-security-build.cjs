const assert = require("node:assert/strict");
const fs = require("node:fs");
const manifest = JSON.parse(
  fs.readFileSync(".next/server/middleware-manifest.json", "utf8"),
);
assert.ok(
  Object.keys(manifest.middleware).length > 0,
  "Security middleware was not included in the production build",
);
console.log("Production security middleware is included");
