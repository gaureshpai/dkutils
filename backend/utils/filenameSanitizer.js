const path = require("node:path");

/**
 * Sanitizes a filename to be safe for use in storage and filesystems.
 * @param {string} filename - The original filename.
 * @param {string} fallback - The fallback filename if sanitization results in an empty string.
 * @returns {string} The sanitized filename.
 */
const sanitizeFilename = (filename, fallback = `file_${Date.now()}`) => {
	if (!filename || typeof filename !== "string") {
		return fallback;
	}

	// 1. Get the base name to remove any path segments (e.g., ../, /)
	let sanitized = path.basename(filename);

	// 2. Normalize Unicode characters
	sanitized = sanitized.normalize("NFC");

	// 3. Replace or remove unsafe/reserved characters
	// Whitelist: letters, numbers, dashes, underscores, and dots (for extensions)
	sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, "_");

	// 4. Prevent directory traversal by removing ".."
	sanitized = sanitized.replace(/\.\./g, ".");

	// 6. Collapse multiple underscores or dashes
	sanitized = sanitized.replace(/[_-]{2,}/g, "_");

	// 7. Trim leading/trailing dots, dashes, and underscores
	sanitized = sanitized.replace(/^[.\-_]+|[.\-_]+$/g, "");

	// 8. Enforce a maximum length (e.g., 200 characters)
	if (sanitized.length > 200) {
		const ext = path.extname(sanitized);
		sanitized = sanitized.substring(0, 200 - ext.length) + ext;
	}

	// 9. Provide a deterministic fallback if the sanitized name is empty
	if (!sanitized || sanitized === "." || sanitized === "..") {
		return fallback;
	}

	return sanitized;
};

module.exports = { sanitizeFilename };
