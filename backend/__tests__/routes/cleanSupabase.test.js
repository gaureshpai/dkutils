"use strict";

// Register module aliases before any route require
require("module-alias/register");

const jwt = require("jsonwebtoken");

// Mock the supabaseCleaner utility before requiring the route
jest.mock("../../utils/supabaseCleaner", () => ({
	cleanSupabaseStorage: jest.fn(),
}));

const { cleanSupabaseStorage } = require("../../utils/supabaseCleaner");

process.env.JWT_SECRET = "test-secret-key";
process.env.SUPABASE_CLEANUP_CRON_SECRET = "test-cron-secret";

const cleanSupabaseRouter = require("../../routes/cleanSupabase");

function makeReq(method, path, { headers = {}, body = {} } = {}) {
	return {
		method,
		url: path,
		path,
		body,
		headers,
		get: (h) => headers[h.toLowerCase()] || null,
		header: (h) => headers[h.toLowerCase()] || null,
	};
}

function makeRes() {
	const res = {
		statusCode: 200,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(data) {
			this.body = data;
			return this;
		},
		send(data) {
			this.body = data;
			return this;
		},
		set() {
			return this;
		},
		end() {},
	};
	return res;
}

function dispatch(router, method, path, options = {}) {
	return new Promise((resolve) => {
		const req = makeReq(method, path, options);
		const res = makeRes();
		router.handle(req, res, () => {});
		setTimeout(() => resolve(res), 300);
	});
}

describe("POST /trigger (requireSecret)", () => {
	beforeEach(() => {
		cleanSupabaseStorage.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("returns 401 when x-cron-secret header is missing", async () => {
		const res = await dispatch(cleanSupabaseRouter, "POST", "/trigger");

		expect(res.statusCode).toBe(401);
		expect(res.body.msg).toBe("Invalid or missing cron secret");
	});

	it("returns 401 when x-cron-secret header is wrong", async () => {
		const res = await dispatch(cleanSupabaseRouter, "POST", "/trigger", {
			headers: { "x-cron-secret": "wrong-secret" },
		});

		expect(res.statusCode).toBe(401);
		expect(res.body.msg).toBe("Invalid or missing cron secret");
	});

	it("returns 401 when x-cron-secret is an empty string", async () => {
		const res = await dispatch(cleanSupabaseRouter, "POST", "/trigger", {
			headers: { "x-cron-secret": "" },
		});

		expect(res.statusCode).toBe(401);
		expect(res.body.msg).toBe("Invalid or missing cron secret");
	});

	it("returns 200 and triggers cleanup when x-cron-secret is correct", async () => {
		const res = await dispatch(cleanSupabaseRouter, "POST", "/trigger", {
			headers: { "x-cron-secret": "test-cron-secret" },
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.msg).toBe("Supabase cleanup triggered successfully.");
		expect(cleanSupabaseStorage).toHaveBeenCalledTimes(1);
	});

	it("returns 500 when cleanSupabaseStorage throws an error", async () => {
		cleanSupabaseStorage.mockRejectedValue(new Error("Storage error"));

		const res = await dispatch(cleanSupabaseRouter, "POST", "/trigger", {
			headers: { "x-cron-secret": "test-cron-secret" },
		});

		expect(res.statusCode).toBe(500);
		expect(res.body.msg).toBe("Failed to trigger Supabase cleanup.");
		expect(res.body.error).toBe("Storage error");
	});

	it("does not call cleanSupabaseStorage when secret is wrong", async () => {
		await dispatch(cleanSupabaseRouter, "POST", "/trigger", {
			headers: { "x-cron-secret": "bad-secret" },
		});

		expect(cleanSupabaseStorage).not.toHaveBeenCalled();
	});
});

describe("POST / (requireAuth - admin only)", () => {
	beforeEach(() => {
		cleanSupabaseStorage.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("returns 401 when no x-auth-token header is provided", async () => {
		const res = await dispatch(cleanSupabaseRouter, "POST", "/");

		expect(res.statusCode).toBe(401);
		expect(res.body.msg).toBe("No token, authorization denied");
	});

	it("returns 401 when x-auth-token is invalid", async () => {
		const res = await dispatch(cleanSupabaseRouter, "POST", "/", {
			headers: { "x-auth-token": "not.a.valid.token" },
		});

		expect(res.statusCode).toBe(401);
		expect(res.body.msg).toBe("Token is not valid");
	});

	it("returns 403 when user is authenticated but not admin", async () => {
		const token = jwt.sign(
			{ user: { id: "userId", role: "free" } },
			process.env.JWT_SECRET,
		);

		const res = await dispatch(cleanSupabaseRouter, "POST", "/", {
			headers: { "x-auth-token": token },
		});

		expect(res.statusCode).toBe(403);
		expect(res.body.msg).toBe("Forbidden - admin only");
	});

	it("returns 403 when user has premium role (not admin)", async () => {
		const token = jwt.sign(
			{ user: { id: "userId", role: "premium" } },
			process.env.JWT_SECRET,
		);

		const res = await dispatch(cleanSupabaseRouter, "POST", "/", {
			headers: { "x-auth-token": token },
		});

		expect(res.statusCode).toBe(403);
		expect(res.body.msg).toBe("Forbidden - admin only");
	});

	it("returns 200 and triggers cleanup when user is admin", async () => {
		const token = jwt.sign(
			{ user: { id: "adminId", role: "admin" } },
			process.env.JWT_SECRET,
		);

		const res = await dispatch(cleanSupabaseRouter, "POST", "/", {
			headers: { "x-auth-token": token },
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.msg).toBe("Supabase cleanup triggered successfully.");
		expect(cleanSupabaseStorage).toHaveBeenCalledTimes(1);
	});

	it("returns 500 when cleanSupabaseStorage throws for authenticated admin", async () => {
		cleanSupabaseStorage.mockRejectedValue(new Error("Cleanup failed"));
		const token = jwt.sign(
			{ user: { id: "adminId", role: "admin" } },
			process.env.JWT_SECRET,
		);

		const res = await dispatch(cleanSupabaseRouter, "POST", "/", {
			headers: { "x-auth-token": token },
		});

		expect(res.statusCode).toBe(500);
		expect(res.body.msg).toBe("Failed to trigger Supabase cleanup.");
		expect(res.body.error).toBe("Cleanup failed");
	});

	it("does not call cleanSupabaseStorage when no auth token is provided", async () => {
		await dispatch(cleanSupabaseRouter, "POST", "/");

		expect(cleanSupabaseStorage).not.toHaveBeenCalled();
	});
});