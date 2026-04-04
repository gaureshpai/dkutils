"use strict";

const authorize = require("../../middleware/authorize");

describe("authorize middleware", () => {
	let res;
	let next;

	beforeEach(() => {
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
		next = jest.fn();
	});

	it("returns 401 when req.user is not set", () => {
		const req = {};
		const middleware = authorize(["admin"]);

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ msg: "Not authorized" });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when req.user exists but has no role", () => {
		const req = { user: { id: "someId" } };
		const middleware = authorize(["admin"]);

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ msg: "Not authorized" });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 403 when user role is not in the allowed roles list", () => {
		const req = { user: { id: "userId", role: "free" } };
		const middleware = authorize(["admin", "premium"]);

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ msg: "Forbidden: Insufficient role" });
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next() when user role is in the allowed roles list", () => {
		const req = { user: { id: "adminId", role: "admin" } };
		const middleware = authorize(["admin"]);

		middleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next() when user role matches one of multiple allowed roles", () => {
		const req = { user: { id: "userId", role: "premium" } };
		const middleware = authorize(["admin", "premium", "free"]);

		middleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 403 when user has admin role but only 'premium' is allowed", () => {
		const req = { user: { id: "adminId", role: "admin" } };
		const middleware = authorize(["premium"]);

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ msg: "Forbidden: Insufficient role" });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when req.user is null", () => {
		const req = { user: null };
		const middleware = authorize(["admin"]);

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ msg: "Not authorized" });
		expect(next).not.toHaveBeenCalled();
	});

	it("handles empty roles array - denies all users", () => {
		const req = { user: { id: "userId", role: "admin" } };
		const middleware = authorize([]);

		middleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ msg: "Forbidden: Insufficient role" });
		expect(next).not.toHaveBeenCalled();
	});
});