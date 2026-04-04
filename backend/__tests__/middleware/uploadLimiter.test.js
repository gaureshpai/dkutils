"use strict";

const uploadLimiter = require("../../middleware/uploadLimiter");

describe("uploadLimiter middleware", () => {
	let res;
	let next;

	beforeEach(() => {
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
		next = jest.fn();
	});

	it("attaches an upload object to req and calls next()", () => {
		const req = {};

		uploadLimiter(req, res, next);

		expect(req.upload).toBeDefined();
		expect(typeof req.upload.single).toBe("function");
		expect(typeof req.upload.array).toBe("function");
		expect(next).toHaveBeenCalledTimes(1);
	});

	it("sets 10MB file size limit for unauthenticated requests (no req.user)", () => {
		const req = {};

		uploadLimiter(req, res, next);

		// multer v2 exposes limits directly on the upload instance
		expect(req.upload.limits.fileSize).toBe(10 * 1024 * 1024);
	});

	it("sets 50MB file size limit for authenticated requests (req.user exists)", () => {
		const req = { user: { id: "userId", role: "free" } };

		uploadLimiter(req, res, next);

		expect(req.upload.limits.fileSize).toBe(50 * 1024 * 1024);
	});

	it("10MB limit is exactly 10485760 bytes", () => {
		const req = {};
		uploadLimiter(req, res, next);
		expect(req.upload.limits.fileSize).toBe(10485760);
	});

	it("50MB limit is exactly 52428800 bytes", () => {
		const req = { user: { id: "userId", role: "premium" } };
		uploadLimiter(req, res, next);
		expect(req.upload.limits.fileSize).toBe(52428800);
	});

	it("does not modify res or call res.status when processing", () => {
		const req = {};

		uploadLimiter(req, res, next);

		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});

	it("the fileFilter accepts image MIME types", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(req, { mimetype: "image/png" }, cb);
		expect(cb).toHaveBeenCalledWith(null, true);

		fileFilter(req, { mimetype: "image/jpeg" }, cb);
		expect(cb).toHaveBeenCalledWith(null, true);

		fileFilter(req, { mimetype: "image/webp" }, cb);
		expect(cb).toHaveBeenCalledWith(null, true);
	});

	it("the fileFilter accepts application/pdf MIME type", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(req, { mimetype: "application/pdf" }, cb);
		expect(cb).toHaveBeenCalledWith(null, true);
	});

	it("the fileFilter accepts xlsx MIME type", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(
			req,
			{
				mimetype:
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			},
			cb,
		);
		expect(cb).toHaveBeenCalledWith(null, true);
	});

	it("the fileFilter accepts docx MIME type", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(
			req,
			{
				mimetype:
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			},
			cb,
		);
		expect(cb).toHaveBeenCalledWith(null, true);
	});

	it("the fileFilter accepts text/csv MIME type", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(req, { mimetype: "text/csv" }, cb);
		expect(cb).toHaveBeenCalledWith(null, true);
	});

	it("the fileFilter rejects unsupported MIME types", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(req, { mimetype: "application/zip" }, cb);
		expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
		expect(cb.mock.calls[0][0].message).toBe("Invalid file type.");
	});

	it("the fileFilter rejects text/plain MIME type", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(req, { mimetype: "text/plain" }, cb);
		expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
	});

	it("the fileFilter rejects application/octet-stream MIME type", () => {
		const req = {};
		uploadLimiter(req, res, next);

		const fileFilter = req.upload.fileFilter;
		const cb = jest.fn();

		fileFilter(req, { mimetype: "application/octet-stream" }, cb);
		expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
		expect(cb.mock.calls[0][0].message).toBe("Invalid file type.");
	});
});