"use strict";

// Register module aliases before any route require
require("module-alias/register");

// Mock express-rate-limit to be a pass-through so tests are not rate-limited
jest.mock("express-rate-limit", () => () => (req, res, next) => next());

// Mock ToolUsage model before requiring the route
jest.mock("../../models/ToolUsage");

const ToolUsage = require("../../models/ToolUsage");

// Set up the schema mock with enum values that analytics.js reads at module load time
ToolUsage.schema = {
	path: jest.fn().mockReturnValue({
		enumValues: ["image", "pdf", "text", "web"],
	}),
};

const analyticsRouter = require("../../routes/analytics");

function makeReq(method, path, { body = {}, query = {}, headers = {} } = {}) {
	return {
		method,
		url: path + (Object.keys(query).length ? "?" + new URLSearchParams(query).toString() : ""),
		path,
		body,
		query,
		headers,
		get: (h) => headers[h.toLowerCase()] || null,
		header: (h) => headers[h.toLowerCase()] || null,
		ip: "127.0.0.1",
		// Express rate-limit reads req.app.get('trust proxy') and req.socket
		app: { get: () => false },
		socket: { remoteAddress: "127.0.0.1" },
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
		setHeader() {},
		getHeader() {
			return null;
		},
	};
	return res;
}

function dispatch(method, path, options = {}) {
	return new Promise((resolve) => {
		const req = makeReq(method, path, options);
		const res = makeRes();
		analyticsRouter.handle(req, res, () => {});
		setTimeout(() => resolve(res), 400);
	});
}

describe("POST /track", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		ToolUsage.schema.path.mockReturnValue({ enumValues: ["image", "pdf", "text", "web"] });
	});

	it("returns 400 when toolName is missing", async () => {
		const res = await dispatch("POST", "/track", { body: { category: "image" } });

		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when category is missing", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: "ImageCompressor" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when toolName is not a string", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: 123, category: "image" },
		});

		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when toolName is empty after trimming", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: "   ", category: "image" },
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Tool name and category are required.");
	});

	it("returns 400 when category is invalid", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: "ImageCompressor", category: "invalid-category" },
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Invalid category");
	});

	it("returns 403 when tool/category pair is not approved", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: "UnknownTool", category: "image" },
		});

		expect(res.statusCode).toBe(403);
		expect(res.body.msg).toBe("Tool and category pair is not approved for tracking.");
	});

	it("returns 400 when toolName exceeds 100 characters", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: "A".repeat(101), category: "image" },
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Tool name or category is too long.");
	});

	it("returns 400 when category exceeds 50 characters", async () => {
		const res = await dispatch("POST", "/track", {
			body: { toolName: "ImageCompressor", category: "a".repeat(51) },
		});

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Tool name or category is too long.");
	});

	it("returns 200 and increments usage count for valid approved pair", async () => {
		ToolUsage.findOneAndUpdate = jest.fn().mockResolvedValue({ usageCount: 5 });

		const res = await dispatch("POST", "/track", {
			body: { toolName: "ImageCompressor", category: "image" },
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.usageCount).toBe(5);
	});

	it("supports legacy 'n' parameter for toolName", async () => {
		ToolUsage.findOneAndUpdate = jest.fn().mockResolvedValue({ usageCount: 3 });

		const res = await dispatch("POST", "/track", {
			body: { n: "ImageCompressor", category: "image" },
		});

		expect(res.statusCode).toBe(200);
		expect(res.body.success).toBe(true);
	});

	it("returns 500 when ToolUsage.findOneAndUpdate throws", async () => {
		ToolUsage.findOneAndUpdate = jest.fn().mockRejectedValue(new Error("DB error"));

		const res = await dispatch("POST", "/track", {
			body: { toolName: "ImageCompressor", category: "image" },
		});

		expect(res.statusCode).toBe(500);
		expect(res.body.msg).toBe("Server Error");
	});

	it("calls findOneAndUpdate with upsert and correct fields for valid pair", async () => {
		ToolUsage.findOneAndUpdate = jest.fn().mockResolvedValue({ usageCount: 1 });

		await dispatch("POST", "/track", {
			body: { toolName: "PdfMerger", category: "pdf" },
		});

		expect(ToolUsage.findOneAndUpdate).toHaveBeenCalledWith(
			{ toolName: "PdfMerger", category: "pdf" },
			expect.objectContaining({ $inc: { usageCount: 1 } }),
			expect.objectContaining({ upsert: true, new: true }),
		);
	});

	it("rejects a valid tool with wrong category mapping", async () => {
		// ImageCompressor is approved for "image", not "pdf"
		const res = await dispatch("POST", "/track", {
			body: { toolName: "ImageCompressor", category: "pdf" },
		});

		expect(res.statusCode).toBe(403);
		expect(res.body.msg).toBe("Tool and category pair is not approved for tracking.");
	});
});

describe("GET /stats", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		ToolUsage.schema.path.mockReturnValue({ enumValues: ["image", "pdf", "text", "web"] });
	});

	it("returns 400 when an invalid category query param is provided", async () => {
		const res = await dispatch("GET", "/stats", { query: { category: "invalid" } });

		expect(res.statusCode).toBe(400);
		expect(res.body.msg).toBe("Invalid category");
	});

	it("returns 200 with paginated stats when no category is specified", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([{ toolName: "ImageCompressor", usageCount: 10 }]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(1);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats");

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("data");
		expect(res.body).toHaveProperty("pagination");
		expect(res.body.pagination.currentPage).toBe(1);
	});

	it("filters by category when valid category is provided", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(0);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		await dispatch("GET", "/stats", { query: { category: "image" } });

		expect(ToolUsage.find).toHaveBeenCalledWith({ category: "image" });
	});

	it("uses default pagination (page=1, limit=50)", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(0);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats");

		expect(res.statusCode).toBe(200);
		expect(res.body.pagination.currentPage).toBe(1);
		expect(res.body.pagination.limit).toBe(50);
	});

	it("respects page and limit query params", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(200);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats", { query: { page: "2", limit: "10" } });

		expect(res.statusCode).toBe(200);
		expect(res.body.pagination.currentPage).toBe(2);
		expect(res.body.pagination.limit).toBe(10);
	});

	it("caps limit at 100", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(0);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats", { query: { limit: "500" } });

		expect(res.statusCode).toBe(200);
		expect(res.body.pagination.limit).toBe(100);
	});

	it("returns hasNext=true when there are more pages", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(100);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats", { query: { page: "1", limit: "10" } });

		expect(res.statusCode).toBe(200);
		expect(res.body.pagination.hasNext).toBe(true);
		expect(res.body.pagination.hasPrev).toBe(false);
	});

	it("returns hasPrev=true when on page > 1", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(100);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats", { query: { page: "2", limit: "10" } });

		expect(res.statusCode).toBe(200);
		expect(res.body.pagination.hasPrev).toBe(true);
	});

	it("returns 500 when ToolUsage.countDocuments throws", async () => {
		ToolUsage.countDocuments = jest.fn().mockRejectedValue(new Error("DB error"));

		const res = await dispatch("GET", "/stats");

		expect(res.statusCode).toBe(500);
		expect(res.body.msg).toBe("Server Error");
	});

	it("returns correct totalPages in pagination metadata", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.countDocuments = jest.fn().mockResolvedValue(25);
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/stats", { query: { limit: "10" } });

		expect(res.statusCode).toBe(200);
		expect(res.body.pagination.totalPages).toBe(3);
		expect(res.body.pagination.total).toBe(25);
	});
});

describe("GET /popular", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		ToolUsage.schema.path.mockReturnValue({ enumValues: ["image", "pdf", "text", "web"] });
	});

	it("returns 200 with tools grouped by all categories", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([
				{ toolName: "ImageCompressor", usageCount: 50 },
			]),
		};
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		const res = await dispatch("GET", "/popular");

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("image");
		expect(res.body).toHaveProperty("pdf");
		expect(res.body).toHaveProperty("text");
		expect(res.body).toHaveProperty("web");
	});

	it("returns 500 when ToolUsage.find throws", async () => {
		ToolUsage.find = jest.fn().mockImplementation(() => {
			throw new Error("DB error");
		});

		const res = await dispatch("GET", "/popular");

		expect(res.statusCode).toBe(500);
		expect(res.body.msg).toBe("Server Error");
	});

	it("queries each category with a limit of 10", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		await dispatch("GET", "/popular");

		// Should be called once per category (4 categories)
		expect(ToolUsage.find).toHaveBeenCalledTimes(4);
		expect(mockQuery.limit).toHaveBeenCalledWith(10);
	});

	it("sorts results by usageCount descending", async () => {
		const mockQuery = {
			sort: jest.fn().mockReturnThis(),
			limit: jest.fn().mockReturnThis(),
			select: jest.fn().mockResolvedValue([]),
		};
		ToolUsage.find = jest.fn().mockReturnValue(mockQuery);

		await dispatch("GET", "/popular");

		expect(mockQuery.sort).toHaveBeenCalledWith({ usageCount: -1 });
	});
});