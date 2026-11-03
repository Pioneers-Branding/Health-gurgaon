// `prisma generate`, tolerant of one Windows quirk: while `next dev` runs, the Prisma query
// engine file is locked and generate fails with EPERM. If the generated client already matches
// prisma/schema.prisma there is nothing to regenerate, so builds may continue; otherwise stop the
// dev server, run `npm run db:generate`, and start it again.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";

const CLIENT_DIR = "node_modules/.prisma/client";

// Prisma keeps a formatted copy of the schema next to the client: compare ignoring layout.
const normalize = (text) => text.replace(/\s+/g, " ").trim();

const result = spawnSync("npx prisma generate", { shell: true, encoding: "utf8" });
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
if (result.status === 0) process.exit(0);

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const locked = /EPERM|EBUSY|operation not permitted/i.test(output);
if (locked && existsSync(CLIENT_DIR)) {
  // The failed rename leaves a temporary copy of the engine behind.
  for (const file of readdirSync(CLIENT_DIR)) if (/\.tmp\d+$/.test(file)) rmSync(`${CLIENT_DIR}/${file}`, { force: true });
}
const generated = `${CLIENT_DIR}/schema.prisma`;
const current = existsSync(generated) && normalize(readFileSync(generated, "utf8")) === normalize(readFileSync("prisma/schema.prisma", "utf8"));

if (locked && current) {
  console.warn("[prisma-generate] The query engine is in use (is `next dev` running?), but the generated client already matches prisma/schema.prisma. Continuing.");
  process.exit(0);
}
if (locked) {
  console.error("[prisma-generate] The Prisma query engine is locked by a running process (usually `next dev`) and the schema has changed. Stop it, run `npm run db:generate`, then start it again.");
}
process.exit(result.status ?? 1);
