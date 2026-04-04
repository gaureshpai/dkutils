"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// authorize middleware is a pure function with no external dependencies
const authorize = require("../../middleware/authorize");

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

test("authorize - no req.user: returns 401 Not authorized", () => {
	const middleware = authorize(["admin"]);
	const req = {};
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	middleware(req, res, next);

	assert.equal(nextCalled, false, "next() should not be called when no user is present");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "Not authorized");
});

test("authorize - req.user without role: returns 401 Not authorized", () => {
	const middleware = authorize(["admin"]);
	const req = { user: { id: "user123" } };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	middleware(req, res, next);

	assert.equal(nextCalled, false, "next() should not be called when user has no role");
	assert.equal(res.statusCode, 401);
	assert.equal(res.body.msg, "Not authorized");
});

test("authorize - user with unauthorized role: returns 403 Forbidden", () => {
	const middleware = authorize(["admin"]);
	const req = { user: { id: "user123", role: "free" } };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	middleware(req, res, next);

	assert.equal(nextCalled, false, "next() should not be called for insufficient role");
	assert.equal(res.statusCode, 403);
	assert.equal(res.body.msg, "Forbidden: Insufficient role");
});

test("authorize - user with authorized role: calls next()", () => {
	const middleware = authorize(["admin"]);
	const req = { user: { id: "admin1", role: "admin" } };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	middleware(req, res, next);

	assert.equal(nextCalled, true, "next() should be called for authorized role");
	assert.equal(res.statusCode, 200, "Status should remain 200 when authorized");
});

test("authorize - multiple allowed roles: permits any of them", () => {
	const middleware = authorize(["admin", "premium"]);

	for (const role of ["admin", "premium"]) {
		const req = { user: { id: "user1", role } };
		const res = mockRes();
		let nextCalled = false;
		const next = () => {
			nextCalled = true;
		};

		middleware(req, res, next);

		assert.equal(nextCalled, true, `next() should be called for role '${role}'`);
	}

	// 'free' should be rejected
	const req = { user: { id: "user2", role: "free" } };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};
	middleware(req, res, next);
	assert.equal(nextCalled, false, "next() should NOT be called for role 'free'");
	assert.equal(res.statusCode, 403);
});

test("authorize - empty roles array: rejects all users", () => {
	const middleware = authorize([]);
	const req = { user: { id: "admin1", role: "admin" } };
	const res = mockRes();
	let nextCalled = false;
	const next = () => {
		nextCalled = true;
	};

	middleware(req, res, next);

	assert.equal(nextCalled, false, "next() should not be called when roles array is empty");
	assert.equal(res.statusCode, 403);
});