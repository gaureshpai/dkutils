"use strict";

// Mock the models before requiring the middleware
jest.mock("../../models/ApiActivity");
jest.mock("../../models/ServiceUsage");

const ApiActivity = require("../../models/ApiActivity");
const { ServiceUsage, TotalUsage } = require("../../models/ServiceUsage");
const apiActivityTracker = require("../../middleware/apiActivityTracker");

describe("apiActivityTracker middleware", () => {
	let req;
	let res;
	let next;
	let mockSave;
	let mockFindOneAndUpdate;

	beforeEach(() => {
		req = {
			path: "/api/test",
			method: "GET",
			ip: "127.0.0.1",
			user: null,
		};
		res = {};
		next = jest.fn();

		mockSave = jest.fn().mockResolvedValue({});
		ApiActivity.mockImplementation(() => ({ save: mockSave }));

		mockFindOneAndUpdate = jest.fn().mockResolvedValue({});
		TotalUsage.findOneAndUpdate = mockFindOneAndUpdate;
		ServiceUsage.findOneAndUpdate = mockFindOneAndUpdate;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("always calls next() even on success", async () => {
		await apiActivityTracker(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
	});

	it("creates an ApiActivity record with correct fields", async () => {
		req.user = { id: "user123" };

		await apiActivityTracker(req, res, next);

		expect(ApiActivity).toHaveBeenCalledWith({
			endpoint: "/api/test",
			method: "GET",
			userId: "user123",
			ipAddress: "127.0.0.1",
		});
		expect(mockSave).toHaveBeenCalledTimes(1);
	});

	it("sets userId to null when user is not authenticated", async () => {
		req.user = null;

		await apiActivityTracker(req, res, next);

		expect(ApiActivity).toHaveBeenCalledWith(
			expect.objectContaining({ userId: null }),
		);
	});

	it("updates TotalUsage with global key increment", async () => {
		await apiActivityTracker(req, res, next);

		expect(TotalUsage.findOneAndUpdate).toHaveBeenCalledWith(
			{ key: "global" },
			{ $inc: { totalCount: 1 }, $setOnInsert: { key: "global" } },
			{ upsert: true, new: true },
		);
	});

	it("updates ServiceUsage with endpoint increment", async () => {
		await apiActivityTracker(req, res, next);

		expect(ServiceUsage.findOneAndUpdate).toHaveBeenCalledWith(
			{ endpoint: "/api/test" },
			{ $inc: { count: 1 } },
			{ upsert: true, new: true },
		);
	});

	it("still calls next() when save throws an error", async () => {
		mockSave.mockRejectedValue(new Error("DB error"));
		const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		await apiActivityTracker(req, res, next);

		expect(next).toHaveBeenCalledTimes(1);
		consoleSpy.mockRestore();
	});

	it("logs an error message when an exception occurs", async () => {
		mockSave.mockRejectedValue(new Error("Connection failed"));
		const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

		await apiActivityTracker(req, res, next);

		expect(consoleSpy).toHaveBeenCalledWith(
			"Error saving API activity:",
			"Connection failed",
		);
		consoleSpy.mockRestore();
	});

	it("tracks the correct endpoint path", async () => {
		req.path = "/api/convert/png-to-jpg";
		req.method = "POST";

		await apiActivityTracker(req, res, next);

		expect(ApiActivity).toHaveBeenCalledWith(
			expect.objectContaining({
				endpoint: "/api/convert/png-to-jpg",
				method: "POST",
			}),
		);
		expect(ServiceUsage.findOneAndUpdate).toHaveBeenCalledWith(
			{ endpoint: "/api/convert/png-to-jpg" },
			expect.any(Object),
			expect.any(Object),
		);
	});
});