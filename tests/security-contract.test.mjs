
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("legacy arbitrary JSON route is absent", async () => {
  await assert.rejects(access(new URL("../app/api/passports/route.ts", import.meta.url)));
});

test("ownership checks do not use nickname or handle", async () => {
  const [access, publish, profile] = await Promise.all([
    readFile(new URL("../packages/shared/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/passports/[id]/publish/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/me/profile/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(access, /assessment\.userId/);
  assert.match(publish, /row\.userId !== user\.userId/);
  assert.match(profile, /HANDLE_TAKEN/);
  assert.doesNotMatch(`${access}${publish}`, /nickname\s*===|nickname\s*!==/);
});

test("server rejects sensitive public Passport text and oversized payloads", async () => {
  const [server, submit] = await Promise.all([
    readFile(new URL("../packages/shared/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/v1/assessments/[id]/submit/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(server, /PAYLOAD_TOO_LARGE/);
  assert.match(server, /PRIVATE KEY/);
  assert.match(server, /Bearer/);
  assert.match(submit, /PUBLIC_TEXT_SENSITIVE/);
  assert.match(submit, /SUBMISSION_REPLAY/);
  assert.match(submit, /NONCE_INVALID/);
});

test("destructive account deletion requires authenticated ownership and exact Handle confirmation", async () => {
  const source = await readFile(new URL("../app/api/v1/me/route.ts", import.meta.url), "utf8");
  assert.match(source, /requireBrowserUser\(request\)/);
  assert.match(source, /findProfileByUser\(user\.userId\)/);
  assert.match(source, /payload\.confirmation !== profile\.handle/);
  assert.match(source, /DELETE FROM profiles WHERE id = \? AND user_id = \?/);
  assert.doesNotMatch(source, /DELETE FROM profiles WHERE handle = \?/);
});
