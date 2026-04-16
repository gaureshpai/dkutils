const multer = require("multer");

const storage = multer.memoryStorage();

/**
 * A middleware to limit the size of uploaded files.
 * @param {object} req - The incoming HTTP request.
 * @param {object} res - The outgoing HTTP response.
 * @param {function} next - The next middleware function to call.
 */
// Docstring for uploadLimiter
const uploadLimiter = (req, res, next) => {
	let fileSizeLimit = 10 * 1024 * 1024;

	if (req.user) {
		fileSizeLimit = 50 * 1024 * 1024;
	}

	const upload = multer({
		storage,
		limits: { fileSize: fileSizeLimit },
		fileFilter: (filterReq, file, cb) => {
			if (
				file.mimetype.startsWith("image/") ||
				file.mimetype === "application/pdf" ||
				file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
				file.mimetype ===
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
				file.mimetype === "text/csv"
			) {
				cb(null, true);
			} else {
				cb(new Error("Invalid file type."), false);
			}
		},
	});

	req.upload = upload;
	next();
};

module.exports = uploadLimiter;
