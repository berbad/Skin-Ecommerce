const { test, before, after, mock } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
process.env.JWT_SECRET = "test-only-secret-never-deploy";
process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.CLIENT_URL = "https://www.eternalbotanic.com";
mock.method(require("nodemailer"), "createTransport", () => ({
  verify() {},
  async sendMail() {
    return { messageId: "test" };
  },
}));
const User = require("../src/models/user.model").default;
const authRoutes = require("../src/routes/auth.routes").default;
const { authMiddleware } = require("../src/middleware/auth.middleware");
const { isAdminMiddleware } = require("../src/middleware/isAdmin.middleware");
let db, server, url, userId, passwordHash;
before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(db.getUri());
  await User.init();
  passwordHash = await bcrypt.hash("SecurePassword12", 4);
  const app = express();
  app.use(cookieParser(), express.json());
  app.use("/api/auth", authRoutes);
  app.get("/admin", authMiddleware, isAdminMiddleware, (req, res) =>
    res.json({ ok: true }),
  );
  app.use((err, req, res, next) =>
    res.status(err.status || 500).json({ message: "error" }),
  );
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  url = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.disconnect();
  if (db) await db.stop();
});
async function account(role = "user") {
  const u = await User.create({
    name: "Test",
    email: require("crypto").randomUUID() + "@example.test",
    password: passwordHash,
    role,
  });
  userId = String(u._id);
  return u;
}
async function req(path, body, cookie = "", method = "POST") {
  const r = await fetch(url + path, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: r.status,
    body: await r.json(),
    cookie: (r.headers.get("set-cookie") || "").split(";")[0],
  };
}
async function login(u, extra = {}) {
  return req("/api/auth/login", {
    email: u.email,
    password: "SecurePassword12",
    ...extra,
  });
}
test("copied session fails immediately after logout", async () => {
  const u = await account();
  const signed = await login(u);
  assert.equal(signed.status, 200);
  assert.equal(
    (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
    200,
  );
  assert.equal((await req("/api/auth/logout", {}, signed.cookie)).status, 200);
  assert.equal(
    (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
    401,
  );
});
test("disabling an account invalidates its current session", async () => {
  const u = await account();
  const signed = await login(u);
  await User.collection.updateOne({ _id: u._id }, { $set: { disabled: true } });
  assert.equal(
    (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
    401,
  );
});
test("role changes invalidate an existing session", async () => {
  const u = await account();
  const signed = await login(u);
  await User.updateOne({ _id: u._id }, { $set: { role: "admin" } });
  assert.equal(
    (await req("/admin", undefined, signed.cookie, "GET")).status,
    401,
  );
});
test("legacy signed JWT is rejected after session migration", async () => {
  const jwt = require("jsonwebtoken");
  const u = await account("admin");
  const token = jwt.sign(
    { id: String(u._id), role: "admin" },
    process.env.JWT_SECRET,
  );
  assert.equal(
    (await req("/admin", undefined, "token=" + token, "GET")).status,
    401,
  );
});
test("unenrolled administrators cannot log in with a password alone", async () => {
  const u = await account("admin");
  assert.equal((await login(u)).status, 403);
});
test("profile endpoint cannot directly replace account email", async () => {
  const u = await account();
  const signed = await login(u);
  const r = await req(
    "/api/auth/profile",
    { email: "attacker@example.test" },
    signed.cookie,
    "PUT",
  );
  assert.equal(r.status, 400);
  assert.equal((await User.findById(u._id)).email, u.email);
});
test("registration rejects passwords exceeding bcrypt byte limit and unknown role", async () => {
  const r = await req("/api/auth/register", {
    name: "Test",
    email: "oversize@example.test",
    password: "A1" + "é".repeat(40),
    role: "admin",
  });
  assert.equal(r.status, 400);
});
test("valid sessions store only hashed identifiers and keep raw token out of JSON", async () => {
  const u = await account();
  const signed = await login(u);
  assert.equal(signed.status, 200);
  const raw = signed.cookie.slice("token=".length);
  assert.match(raw, /^[a-f0-9]{64}$/);
  const records = await mongoose.connection
    .collection("sessions")
    .find({ userId: String(u._id) })
    .toArray();
  assert.equal(records.length, 1);
  assert.ok(!JSON.stringify(records).includes(raw));
  assert.ok(!JSON.stringify(signed.body).includes(raw));
});

test("admin MFA is required, accepted once, and recovery codes cannot be replayed", async () => {
  const u = await account("admin");
  const { Secret, TOTP } = require("otpauth");
  const secret = new Secret({ size: 20 });
  const { encryptMfaSecret } = require("../src/security/mfa");
  const { tokenHash } = require("../src/services/sessions");
  const recovery = "ab".repeat(16);
  await User.updateOne(
    { _id: u._id },
    {
      $set: {
        mfaSecret: encryptMfaSecret(secret.base32),
        recoveryCodes: [tokenHash(recovery)],
      },
    },
  );
  assert.equal((await login(u)).status, 403);
  const code = new TOTP({ secret }).generate();
  const signed = await login(u, { code });
  assert.equal(signed.status, 200);
  assert.equal(
    (await req("/admin", undefined, signed.cookie, "GET")).status,
    200,
  );
  assert.equal((await login(u, { code })).status, 403);
  assert.equal((await login(u, { code: recovery })).status, 200);
  assert.equal((await login(u, { code: recovery })).status, 403);
});

test("password recovery token is single-use and revokes copied sessions", async () => {
  const u = await account();
  const signed = await login(u);
  const mail = require("../src/utils/mailer");
  const messages = [];
  const stub = mock.method(mail, "sendReceiptEmail", async (...args) =>
    messages.push(args),
  );
  try {
    assert.equal(
      (await req("/api/auth/forgot-password", { email: u.email })).status,
      200,
    );
    const text = messages[0].join(" ");
    const token = text.match(/token=([a-f0-9]{64})/)[1];
    const body = { token, password: "ChangedPassword12" };
    assert.equal((await req("/api/auth/reset-password", body)).status, 200);
    assert.equal((await req("/api/auth/reset-password", body)).status, 400);
    assert.equal(
      (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
      401,
    );
    assert.equal(
      (
        await req("/api/auth/login", {
          email: u.email,
          password: "ChangedPassword12",
        })
      ).status,
      200,
    );
  } finally {
    stub.mock.restore();
  }
});

test("email change requires current password, verifies mailbox, and revokes sessions", async () => {
  const u = await account();
  const signed = await login(u);
  const mail = require("../src/utils/mailer");
  const messages = [];
  const stub = mock.method(mail, "sendReceiptEmail", async (...args) =>
    messages.push(args),
  );
  try {
    const email =
      "verified-" + require("crypto").randomUUID() + "@example.test";
    assert.equal(
      (
        await req(
          "/api/auth/email-change",
          { email, password: "incorrect" },
          signed.cookie,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await req(
          "/api/auth/email-change",
          { email, password: "SecurePassword12" },
          signed.cookie,
        )
      ).status,
      200,
    );
    assert.equal((await User.findById(u._id)).email, u.email);
    const token = messages[0].join(" ").match(/token=([a-f0-9]{64})/)[1];
    assert.equal((await req("/api/auth/confirm-email", { token })).status, 200);
    assert.equal((await User.findById(u._id)).email, email);
    assert.equal((await req("/api/auth/confirm-email", { token })).status, 400);
    assert.equal(
      (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
      401,
    );
  } finally {
    stub.mock.restore();
  }
});

test("disable then re-enable cannot resurrect a session even without an intervening request", async () => {
  const u = await account();
  const signed = await login(u);
  await User.updateOne({ _id: u._id }, { $set: { disabled: true } });
  await User.updateOne({ _id: u._id }, { $set: { disabled: false } });
  assert.equal(
    (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
    401,
  );
});

test("saving stale security fields still revokes sessions issued after an intervening mutation", async () => {
  const u = await account();
  const stale = await User.findById(u._id);
  await User.updateOne(
    { _id: u._id },
    { $set: { password: await bcrypt.hash("InterveningPassword12", 4) } },
  );
  const signed = await req("/api/auth/login", {
    email: u.email,
    password: "InterveningPassword12",
  });
  assert.equal(signed.status, 200);
  stale.password = await bcrypt.hash("LatestPassword12", 4);
  await stale.save();
  assert.equal(
    (await req("/api/auth/profile", undefined, signed.cookie, "GET")).status,
    401,
  );
  assert.equal(
    (
      await req("/api/auth/login", {
        email: u.email,
        password: "LatestPassword12",
      })
    ).status,
    200,
  );
});
