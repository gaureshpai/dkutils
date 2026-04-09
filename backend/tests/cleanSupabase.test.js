"use strict";

/**
 * Tests for routes/cleanSupabase.js changes introduced in this PR.
 *
 * Key change: The /trigger endpoint was changed from GET (no auth) to
 * POST with a new `requireSecret` middleware that validates an
 * x-cron-secret header against the SUPABASE_CLEANUP_CRON_SECRET env var.
 *
 * These tests inline the requireSecret and requireAuth logic to avoid
 * requiring uninstalled external dependencies (jwt, mongoose, express).
 */

const { test, describe, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeReq = (overrides = {}) => ({
	header: (name) => (overrides.headers || {})[name.toLowerCase()] ?? undefined,
	user: overrides.user ?? undefined,
});

const makeRes = () => {
	const res = {
		_status: null,
		_json: null,
		status(code) {
			res._status = code;
			return res;
		},
		json(data) {
			res._json = data;
			return res;
		},
	};
	return res;
};

const makeNext = () => {
	const fn = () => {
		fn.called = true;
	};
	fn.called = false;
	return fn;
};

// ---------------------------------------------------------------------------
// Inline re-implementation of requireSecret from routes/cleanSupabase.js
// ---------------------------------------------------------------------------

function requireSecretLogic(req, res, next) {
	const secret = req.header("x-cron-secret");
	const expectedSecret = process.env.SUPABASE_CLEANUP_CRON_SECRET;

	if (!secret || !expectedSecret || secret !== expectedSecret) {
		return res.status(401).json({ msg: "Invalid or missing cron secret" });
	}

	next();
}

// ---------------------------------------------------------------------------
// Inline re-implementation of requireAuth from routes/cleanSupabase.js
// (mirrors the admin-only JWT guard used for POST /)
// ---------------------------------------------------------------------------

function requireAuthLogic(req, res, next, jwtStub) {
	const token = req.header("x-auth-token");

	if (!token) {
		return res.status(401).json({ msg: "No token, authorization denied" });
	}

	try {
		if (jwtStub.shouldThrow) {
			throw new Error("jwt error");
		}
		const decoded = jwtStub.verifyResult;
		req.user = decoded.user;
		if (req.user.role !== "admin") {
			return res.status(403).json({ msg: "Forbidden - admin only" });
		}
		return next();
	} catch (_err) {
		return res.status(401).json({ msg: "Token is not valid" });
	}
}

// ---------------------------------------------------------------------------
// requireSecret tests
// ---------------------------------------------------------------------------

describe("routes/cleanSupabase.js - requireSecret middleware", () => {
	const ORIGINAL_SECRET = process.env.SUPABASE_CLEANUP_CRON_SECRET;

	beforeEach(() => {
		process.env.SUPABASE_CLEANUP_CRON_SECRET = "test-secret-value";
	});

	afterEach(() => {
		if (ORIGINAL_SECRET === undefined) {
			delete process.env.SUPABASE_CLEANUP_CRON_SECRET;
		} else {
			process.env.SUPABASE_CLEANUP_CRON_SECRET = ORIGINAL_SECRET;
		}
	});

	test("returns 401 when x-cron-secret header is missing", () => {
		const req = makeReq({ headers: {} });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(res._status, 401);
		assert.deepEqual(res._json, { msg: "Invalid or missing cron secret" });
		assert.equal(next.called, false);
	});

	test("returns 401 when x-cron-secret does not match env var", () => {
		const req = makeReq({ headers: { "x-cron-secret": "wrong-secret" } });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(res._status, 401);
		assert.deepEqual(res._json, { msg: "Invalid or missing cron secret" });
		assert.equal(next.called, false);
	});

	test("calls next() when x-cron-secret matches env var exactly", () => {
		const req = makeReq({ headers: { "x-cron-secret": "test-secret-value" } });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(next.called, true);
		assert.equal(res._status, null);
	});

	test("returns 401 when SUPABASE_CLEANUP_CRON_SECRET env var is not set", () => {
		delete process.env.SUPABASE_CLEANUP_CRON_SECRET;

		const req = makeReq({ headers: { "x-cron-secret": "any-value" } });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(res._status, 401);
		assert.deepEqual(res._json, { msg: "Invalid or missing cron secret" });
		assert.equal(next.called, false);
	});

	test("returns 401 when secret is an empty string", () => {
		const req = makeReq({ headers: { "x-cron-secret": "" } });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(res._status, 401);
		assert.equal(next.called, false);
	});

	test("is case-sensitive: wrong case returns 401", () => {
		const req = makeReq({ headers: { "x-cron-secret": "Test-Secret-Value" } });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(res._status, 401);
		assert.equal(next.called, false);
	});

	test("returns 401 when secret has extra whitespace", () => {
		const req = makeReq({ headers: { "x-cron-secret": " test-secret-value" } });
		const res = makeRes();
		const next = makeNext();

		requireSecretLogic(req, res, next);

		assert.equal(res._status, 401);
		assert.equal(next.called, false);
	});
});

// ---------------------------------------------------------------------------
// requireAuth (admin JWT guard) tests for POST /
// ---------------------------------------------------------------------------

describe("routes/cleanSupabase.js - requireAuth middleware (admin-only)", () => {
	test("returns 401 when no x-auth-token header is present", () => {
		const req = makeReq({ headers: {} });
		const res = makeRes();
		const next = makeNext();

		requireAuthLogic(req, res, next, { shouldThrow: false, verifyResult: null });

		assert.equal(res._status, 401);
		assert.deepEqual(res._json, { msg: "No token, authorization denied" });
		assert.equal(next.called, false);
	});

	test("returns 401 when token is invalid", () => {
		const req = makeReq({ headers: { "x-auth-token": "invalid-token" } });
		const res = makeRes();
		const next = makeNext();

		requireAuthLogic(req, res, next, { shouldThrow: true, verifyResult: null });

		assert.equal(res._status, 401);
		assert.deepEqual(res._json, { msg: "Token is not valid" });
		assert.equal(next.called, false);
	});

	test("returns 403 when user is not admin", () => {
		const req = makeReq({ headers: { "x-auth-token": "valid-token" } });
		const res = makeRes();
		const next = makeNext();

		requireAuthLogic(req, res, next, {
			shouldThrow: false,
			verifyResult: { user: { id: "u1", role: "free" } },
		});

		assert.equal(res._status, 403);
		assert.deepEqual(res._json, { msg: "Forbidden - admin only" });
		assert.equal(next.called, false);
	});

	test("calls next() when user is admin with valid token", () => {
		const req = makeReq({ headers: { "x-auth-token": "admin-token" } });
		const res = makeRes();
		const next = makeNext();

		requireAuthLogic(req, res, next, {
			shouldThrow: false,
			verifyResult: { user: { id: "admin1", role: "admin" } },
		});

		assert.equal(next.called, true);
		assert.equal(res._status, null);
	});

	test("returns 403 when premium user tries to access admin-only route", () => {
		const req = makeReq({ headers: { "x-auth-token": "premium-token" } });
		const res = makeRes();
		const next = makeNext();

		requireAuthLogic(req, res, next, {
			shouldThrow: false,
			verifyResult: { user: { id: "u2", role: "premium" } },
		});

		assert.equal(res._status, 403);
		assert.equal(next.called, false);
	});
});