// API tests. They run the real routes with an in-memory stand-in for MongoDB
// and a fake AI service, so no database, Cloudinary or Python is needed.
// Run with: npm test
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.AI_SERVICE_URL = "http://127.0.0.1:18765";

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import MissingPerson from "../models/MissingPerson.js";
import FoundPerson from "../models/FoundPerson.js";

// ---------- in-memory database ----------
const db = { users: [], missing: [], found: [] };
const same = (a, b) => String(a) === String(b);

// A minimal chainable query: .select() / .populate() / .lean() / .sort() / .limit() then await
const query = (value) => {
  const p = Promise.resolve(value);
  const q = { then: p.then.bind(p), catch: p.catch.bind(p) };
  for (const m of ["select", "populate", "lean", "sort", "limit"]) q[m] = () => q;
  return q;
};

User.exists = async (f) => db.users.find((u) => u.email === f.email) || null;
User.create = async (d) => { const u = new User(d); db.users.push(u); return u; };
User.findOne = (f) => query(db.users.find((u) => u.email === f.email) || null);
User.findById = async (id) => db.users.find((u) => same(u._id, id)) || null;

MissingPerson.create = async (d) => { const m = new MissingPerson(d); db.missing.push(m); return m; };
MissingPerson.findById = (id) => query(db.missing.find((m) => same(m._id, id)) || null);
MissingPerson.prototype.save = async function () { return this; };
MissingPerson.prototype.deleteOne = async function () { db.missing = db.missing.filter((m) => m !== this); };

FoundPerson.create = async (d) => { const f = new FoundPerson(d); db.found.push(f); return f; };
FoundPerson.findById = (id) => query(db.found.find((f) => same(f._id, id)) || null);
FoundPerson.find = () => query([]);
const updateManyCalls = [];
FoundPerson.updateMany = async (...args) => { updateManyCalls.push(args); return {}; };
FoundPerson.prototype.deleteOne = async function () { db.found = db.found.filter((f) => f !== this); };

// ---------- fake AI service ----------
let aiServer, apiServer, base;
const fakeAi = express().use(express.json());
fakeAi.post("/api/missing/", (req, res) =>
  req.body.images[0].includes("noface")
    ? res.status(422).json({ detail: "No face detected. Please upload a clear, front-facing photo." })
    : res.json({ embeddings: [[0.1, 0.2]], skipped: [] })
);
fakeAi.post("/api/found/", (_req, res) =>
  res.json({
    embedding: [1, 2],
    matches: [{ id: new mongoose.Types.ObjectId().toString(), distance: 0.2, confidence: 80 }],
  })
);

before(async () => {
  aiServer = fakeAi.listen(18765);
  const app = express().use(express.json());
  app.use("/api/auth", (await import("../routes/authRoutes.js")).default);
  app.use("/api/missing", (await import("../routes/missingRoutes.js")).default);
  app.use("/api/found", (await import("../routes/foundRoutes.js")).default);
  app.use("/api/upload", (await import("../routes/uploadRoutes.js")).default);
  // same error handler as server.js
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ message: status >= 500 && !err.status ? "server error" : err.message });
  });
  await new Promise((r) => { apiServer = app.listen(0, r); });
  base = `http://127.0.0.1:${apiServer.address().port}`;
});

after(() => {
  aiServer?.close();
  apiServer?.close();
});

async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const tokens = {};

test("signup validates input and never creates admins", async () => {
  assert.equal((await call("POST", "/api/auth/signup", { name: "A", email: "a@x.com", password: "short" })).status, 400);
  const r = await call("POST", "/api/auth/signup", { name: "Asha", email: "a@x.com", password: "longpassword", role: "admin" });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, "citizen");
  assert.ok(!JSON.stringify(r.body).includes("password"), "no password hash in response");
  assert.equal((await call("POST", "/api/auth/signup", { name: "A", email: "A@x.com", password: "longpassword" })).status, 409);
  tokens.asha = r.body.token;
  tokens.ben = (await call("POST", "/api/auth/signup", { name: "Ben", email: "b@x.com", password: "longpassword", role: "family" })).body.token;
});

test("login checks the password and does not leak the hash", async () => {
  assert.equal((await call("POST", "/api/auth/login", { email: "a@x.com", password: "wrongpass" })).status, 401);
  const r = await call("POST", "/api/auth/login", { email: "a@x.com", password: "longpassword" });
  assert.equal(r.status, 200);
  assert.ok(!JSON.stringify(r.body).includes("$2"));
  assert.equal((await call("GET", "/api/auth/me", null, r.body.token)).body.user.email, "a@x.com");
});

test("protected routes need a valid login", async () => {
  assert.equal((await call("POST", "/api/missing", { name: "B", images: ["u"] })).status, 401);
  assert.equal((await call("POST", "/api/upload", {})).status, 401);
  assert.equal((await call("GET", "/api/missing", null, "garbage")).status, 401);
});

test("registering a missing person", async () => {
  const noFace = await call("POST", "/api/missing", { name: "B", images: ["http://img/noface.jpg"] }, tokens.asha);
  assert.equal(noFace.status, 422);
  assert.match(noFace.body.message, /No face/);

  const r = await call("POST", "/api/missing", { name: "Ravi Kumar", age: "12", gender: "male", images: ["http://img/ok.jpg"] }, tokens.asha);
  assert.equal(r.status, 201);
  assert.equal(r.body.data.name, "Ravi Kumar");
  assert.ok(!("embeddings" in r.body.data), "embeddings are not sent to the browser");
  assert.equal(db.missing[0].embeddings.length, 1);
});

test("only the reporter or an admin can edit or delete a case", async () => {
  const id = String(db.missing[0]._id);
  assert.equal((await call("PATCH", `/api/missing/${id}`, { name: "Hacked" }, tokens.ben)).status, 403);

  const edit = await call("PATCH", `/api/missing/${id}`, { name: "Ravi K.", age: 13 }, tokens.asha);
  assert.equal(edit.status, 200);
  assert.equal(edit.body.data.name, "Ravi K.");
  assert.equal(edit.body.data.age, 13);
  assert.equal((await call("PATCH", `/api/missing/${id}`, { name: "  " }, tokens.asha)).status, 400);

  const admin = await User.create({ name: "Admin", email: "admin@x.com", password: await bcrypt.hash("adminpass1", 4), role: "admin" });
  tokens.admin = (await call("POST", "/api/auth/login", { email: admin.email, password: "adminpass1" })).body.token;
  assert.equal((await call("PATCH", `/api/missing/${id}/status`, { status: "found" }, tokens.admin)).status, 200);
});

test("reporting sightings", async () => {
  const caseId = String(db.missing[0]._id);

  const ai = await call("POST", "/api/found", { image: "http://img/ok.jpg" }, tokens.ben);
  assert.equal(ai.status, 201);
  assert.equal(ai.body.matches.length, 1);

  const manual = await call("POST", "/api/found", { location: "Pune station", missingPersonId: caseId }, tokens.ben);
  assert.equal(manual.status, 201);
  assert.equal(db.found.at(-1).matches[0].manual, true);
  assert.equal(db.found.at(-1).status, "matched");

  assert.equal((await call("POST", "/api/found", { missingPersonId: caseId }, tokens.ben)).status, 400, "needs a location");
  assert.equal((await call("POST", "/api/found", { location: "x", missingPersonId: String(new mongoose.Types.ObjectId()) }, tokens.ben)).status, 404);
  assert.equal((await call("POST", "/api/found", { location: "x" }, tokens.ben)).status, 400, "general report needs a photo");
});

test("only the sender or an admin can delete a sighting", async () => {
  const report = db.found.at(-1);
  assert.equal((await call("DELETE", `/api/found/${report._id}`, null, tokens.asha)).status, 403);
  assert.equal((await call("DELETE", `/api/found/${report._id}`, null, tokens.ben)).status, 200);
  assert.ok(!db.found.includes(report));
  assert.equal((await call("DELETE", `/api/found/${db.found[0]._id}`, null, tokens.admin)).status, 200);
});

test("deleting a case unlinks its sightings", async () => {
  const id = String(db.missing[0]._id);
  assert.equal((await call("DELETE", `/api/missing/${id}`, null, tokens.ben)).status, 403);
  assert.equal((await call("DELETE", `/api/missing/${id}`, null, tokens.asha)).status, 200);
  assert.equal(db.missing.length, 0);
  assert.ok(updateManyCalls.length >= 1, "sightings were updated");
  assert.equal((await call("DELETE", `/api/missing/${id}`, null, tokens.asha)).status, 404);
});

test("clear errors when the AI service is down", async () => {
  aiServer.close();
  await new Promise((r) => setTimeout(r, 50));
  const r = await call("POST", "/api/found", { image: "http://img/ok.jpg" }, tokens.ben);
  assert.equal(r.status, 503);
  assert.match(r.body.message, /not running/);
});
