"use strict";

const jwt = require("jsonwebtoken");

// Set up test secret before requiring the module
process.env.JWT_SECRET = "test-secret-key";

const authMiddleware = require("../../middleware/auth");

describe("authMiddleware", () => {
	let req;
	let res;
	let next;

	beforeEach(() => {
		req = { header: jest.fn() };
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
		next = jest.fn();
	});

	it("calls next() with no user when no token is provided", () => {
		req.header.mockReturnValue(undefined);

		authMiddleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(req.user).toBeUndefined();
		expect(res.status).not.toHaveBeenCalled();
	});

	it("calls next() and sets req.user when a valid token is provided", () => {
		const payload = { user: { id: "abc123", role: "free" } };
		const token = jwt.sign(payload, process.env.JWT_SECRET);
		req.header.mockReturnValue(token);

		authMiddleware(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		expect(req.user).toBeDefined();
		expect(req.user.id).toBe("abc123");
		expect(req.user.role).toBe("free");
		expect(res.status).not.toHaveBeenCalled();
	});

	it("returns 401 when the token is invalid", () => {
		req.header.mockReturnValue("invalid.token.value");

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ msg: "Token is not valid" });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when the token is signed with the wrong secret", () => {
		const payload = { user: { id: "abc123", role: "free" } };
		const token = jwt.sign(payload, "wrong-secret");
		req.header.mockReturnValue(token);

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ msg: "Token is not valid" });
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when the token has expired", () => {
		const payload = { user: { id: "abc123", role: "free" } };
		const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: -1 });
		req.header.mockReturnValue(token);

		authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ msg: "Token is not valid" });
		expect(next).not.toHaveBeenCalled();
	});

	it("sets req.user.role from token payload", () => {
		const payload = { user: { id: "adminId", role: "admin" } };
		const token = jwt.sign(payload, process.env.JWT_SECRET);
		req.header.mockReturnValue(token);

		authMiddleware(req, res, next);

		expect(req.user.role).toBe("admin");
		expect(next).toHaveBeenCalledTimes(1);
	});

	it("reads the token from the x-auth-token header", () => {
		const payload = { user: { id: "user1", role: "premium" } };
		const token = jwt.sign(payload, process.env.JWT_SECRET);
		req.header.mockImplementation((name) => (name === "x-auth-token" ? token : undefined));

		authMiddleware(req, res, next);

		expect(req.header).toHaveBeenCalledWith("x-auth-token");
		expect(next).toHaveBeenCalledTimes(1);
	});
});