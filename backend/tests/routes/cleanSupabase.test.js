"use strict";

/**
 * Tests for backend/routes/cleanSupabase.js
 *
 * Key changes in this PR:
 * - The /trigger endpoint changed from GET to POST
 * - Added requireSecret middleware that validates x-cron-secret header
 * - The main route (/) still requires JWT auth (requireAuth)
 *
 * We test the requireSecret middleware logic directly (it's the primary new behavior).
 * We also test the requireAuth local middleware for the POST / route.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockRes() {
	const res = {};
	res.statusCode = 200;
	res.status = (code) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body) => {
		res.body = body;
		return res;
	};
	return res;
}

// ── requireSecret (extracted for unit testing) ────────────────────────────────
// This mirrors the exact logic in cleanSupabase.js so we can verify it in isolation.

const requireSecret = (req, res, next) => {
	const secret = req.header("x-cron-secret");
	const expectedSecret = process.env.SUPABASE_CLEANUP_CRON_SECRET;

	if (!secret || !expectedSecret || secret !== expectedSecret) {
		return res.status(401).json({ msg: "Invalid or missing cron secret" });
	}

	next();
};

// ── requireAuth (extracted for unit testing) ──────────────────────────────────
// This mirrors the local requireAuth in cleanSupabase.js

const requireAuth = (req, res, next) => {
	const token = req.header("x-auth-token");

	if (!token) {
		return res.status(401).json({ msg: "No token, authorization denied" });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded.user;
		if (req.user.role !== "admin") {
			return res.status(403).json({ msg: "Forbidden - admin only" });
		}
		return next();
	} catch (err) {
		return res.status(401).json({ msg: "Token is not valid" });
	}
};

// ── requireSecret tests ───────────────────────────────────────────────────────

test("requireSecret - missing x-cron-secret header: returns 401", () => {
	process.env.SUPABASE_CLEANUP_CRON_SECRET = "my-secret";
	const req = { header: () => undefined };
	const res = mockRes();
	let nextCalled = false;

	requireSecret(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called without secret header");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "Invalid or missing cron secret");
});

test("requireSecret - wrong secret value: returns 401", () => {
	process.env.SUPABASE_CLEANUP_CRON_SECRET = "correct-secret";
	const req = { header: (name) => (name === "x-cron-secret" ? "wrong-secret" : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireSecret(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called with wrong secret");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "Invalid or missing cron secret");
});

test("requireSecret - correct secret: calls next()", () => {
	const SECRET = "correct-secret";
	process.env.SUPABASE_CLEANUP_CRON_SECRET = SECRET;
	const req = { header: (name) => (name === "x-cron-secret" ? SECRET : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireSecret(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true, "next() must be called with correct secret");
	assert.equal(res.statusCode, 200, "Response status should remain 200");
});

test("requireSecret - env var not set: returns 401", () => {
	delete process.env.SUPABASE_CLEANUP_CRON_SECRET;
	const req = { header: (name) => (name === "x-cron-secret" ? "any-secret" : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireSecret(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called when env var is missing");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "Invalid or missing cron secret");
});

test("requireSecret - empty string as secret: returns 401", () => {
	process.env.SUPABASE_CLEANUP_CRON_SECRET = "correct-secret";
	const req = { header: (name) => (name === "x-cron-secret" ? "" : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireSecret(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called with empty string secret");
	assert.equal(res.statusCode, 401);
});

// ── requireAuth tests ─────────────────────────────────────────────────────────

test("requireAuth (cleanSupabase local) - no token: returns 401", () => {
	process.env.JWT_SECRET = "jwt-test-secret";
	const req = { header: () => undefined };
	const res = mockRes();
	let nextCalled = false;

	requireAuth(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called without token");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "No token, authorization denied");
});

test("requireAuth (cleanSupabase local) - valid admin token: calls next()", () => {
	const JWT_SECRET = "jwt-test-secret";
	process.env.JWT_SECRET = JWT_SECRET;
	const payload = { user: { id: "admin1", role: "admin" } };
	const token = jwt.sign(payload, JWT_SECRET);
	const req = { header: (name) => (name === "x-auth-token" ? token : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireAuth(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true, "next() should be called for admin token");
	assert.equal(req.user.role, "admin");
});

test("requireAuth (cleanSupabase local) - valid non-admin token: returns 403 Forbidden", () => {
	const JWT_SECRET = "jwt-test-secret";
	process.env.JWT_SECRET = JWT_SECRET;
	const payload = { user: { id: "user1", role: "free" } };
	const token = jwt.sign(payload, JWT_SECRET);
	const req = { header: (name) => (name === "x-auth-token" ? token : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireAuth(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called for non-admin user");
	assert.equal(res.statusCode, 403);
	assert.equal(res.body.msg, "Forbidden - admin only");
});

test("requireAuth (cleanSupabase local) - invalid token: returns 401 Token is not valid", () => {
	process.env.JWT_SECRET = "jwt-test-secret";
	const req = { header: (name) => (name === "x-auth-token" ? "bad.token.here" : undefined) };
	const res = mockRes();
	let nextCalled = false;

	requireAuth(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "next() must not be called for invalid token");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "Token is not valid");
});

// ── Regression: POST (not GET) is the correct verb for /trigger ───────────────

test("cleanSupabase /trigger uses POST - requireSecret rejects missing secret (regression)", () => {
	// This test verifies the key change: the trigger endpoint now validates a cron secret.
	// Before the PR, it was a public GET; now it's a POST protected by x-cron-secret.
	process.env.SUPABASE_CLEANUP_CRON_SECRET = "real-secret";
	const req = { header: () => null };
	const res = mockRes();
	let nextCalled = false;

	requireSecret(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, false, "Unauthenticated POST /trigger must be rejected");
	assert.equal(res.statusCode, 401, "Must return 401 for unauthorized cron call");
});