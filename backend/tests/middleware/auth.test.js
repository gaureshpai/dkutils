"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

// Load the auth middleware directly (only dep is jwt, which is installed)
const authMiddleware = require("../../middleware/auth");

const JWT_SECRET = "test-secret";

/**
 * Creates a mock res object with a status/json chain and captures calls.
 */
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

test("auth middleware - no token: calls next() without setting req.user", () => {
	process.env.JWT_SECRET = JWT_SECRET;
	const req = { header: () => undefined };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	authMiddleware(req, res, next);

	assert.equal(nextCalled, true, "next() should be called when no token is provided");
	assert.equal(req.user, undefined, "req.user should not be set when no token is provided");
});

test("auth middleware - valid token: sets req.user and calls next()", () => {
	process.env.JWT_SECRET = JWT_SECRET;
	const payload = { user: { id: "user123", role: "free" } };
	const token = jwt.sign(payload, JWT_SECRET);

	const req = { header: (name) => (name === "x-auth-token" ? token : undefined) };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	authMiddleware(req, res, next);

	assert.equal(nextCalled, true, "next() should be called with a valid token");
	assert.equal(req.user.id, "user123", "req.user.id should match token payload");
	assert.equal(req.user.role, "free", "req.user.role should match token payload");
});

test("auth middleware - invalid token: returns 401 and does not call next()", () => {
	process.env.JWT_SECRET = JWT_SECRET;
	const req = { header: (name) => (name === "x-auth-token" ? "invalid.token.value" : undefined) };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	authMiddleware(req, res, next);

	assert.equal(nextCalled, false, "next() should NOT be called with an invalid token");
	assert.equal(res.statusCode, 401, "Should respond with 401 for invalid token");
	assert.equal(res.body.msg, "Token is not valid");
});

test("auth middleware - token signed with wrong secret: returns 401", () => {
	process.env.JWT_SECRET = JWT_SECRET;
	const payload = { user: { id: "user123", role: "free" } };
	const token = jwt.sign(payload, "wrong-secret");

	const req = { header: (name) => (name === "x-auth-token" ? token : undefined) };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	authMiddleware(req, res, next);

	assert.equal(nextCalled, false, "next() should NOT be called with token signed by wrong secret");
	assert.equal(res.statusCode, 401, "Should respond with 401 for wrongly-signed token");
	assert.equal(res.body.msg, "Token is not valid");
});

test("auth middleware - expired token: returns 401", () => {
	process.env.JWT_SECRET = JWT_SECRET;
	const payload = { user: { id: "user123", role: "free" } };
	const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1ms" });

	// Wait for token to expire
	const start = Date.now();
	while (Date.now() - start < 10) {
		// busy wait for expiry
	}

	const req = { header: (name) => (name === "x-auth-token" ? token : undefined) };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	authMiddleware(req, res, next);

	assert.equal(nextCalled, false, "next() should NOT be called with expired token");
	assert.equal(res.statusCode, 401, "Should respond with 401 for expired token");
});

test("auth middleware - token with admin role: sets req.user.role to admin", () => {
	process.env.JWT_SECRET = JWT_SECRET;
	const payload = { user: { id: "admin1", role: "admin" } };
	const token = jwt.sign(payload, JWT_SECRET);

	const req = { header: (name) => (name === "x-auth-token" ? token : undefined) };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	authMiddleware(req, res, next);

	assert.equal(nextCalled, true, "next() should be called with valid admin token");
	assert.equal(req.user.role, "admin", "req.user.role should be 'admin'");
});