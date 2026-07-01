const { createClient } = require("@supabase/supabase-js");
const fs = require("node:fs/promises");
const path = require("node:path");

let supabase = null;
const LOCAL_STORAGE_DIR = path.join(__dirname, "..", ".local-storage");

const normalizeStoragePath = (filePath) => {
	if (!filePath || typeof filePath !== "string") {
		throw new Error("Storage path is required.");
	}

	const normalized = path.posix.normalize(filePath.replaceAll("\\", "/"));
	if (
		normalized === "." ||
		normalized === ".." ||
		normalized.startsWith("../") ||
		normalized.includes("/../") ||
		path.isAbsolute(normalized)
	) {
		throw new Error("Invalid storage path.");
	}

	return normalized;
};

const getLocalPath = (filePath) => {
	const normalized = normalizeStoragePath(filePath);
	const localPath = path.resolve(LOCAL_STORAGE_DIR, ...normalized.split("/"));
	const storageRoot = path.resolve(LOCAL_STORAGE_DIR);

	if (localPath !== storageRoot && !localPath.startsWith(`${storageRoot}${path.sep}`)) {
		throw new Error("Invalid storage path.");
	}

	return { normalized, localPath };
};

const createLocalDownloadData = (buffer, type) => ({
	type,
	async arrayBuffer() {
		return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
	},
});

const readMetadata = async (localPath) => {
	try {
		const metadata = await fs.readFile(`${localPath}.meta.json`, "utf8");
		return JSON.parse(metadata);
	} catch (_err) {
		return {};
	}
};

const statToStorageItem = (item, stats) => ({
	id: stats.isDirectory() ? null : `${item}-${stats.mtimeMs}`,
	name: item,
	created_at: stats.birthtime.toISOString(),
	updated_at: stats.mtime.toISOString(),
	last_accessed_at: stats.atime.toISOString(),
	metadata: null,
});

const createLocalStorageClient = () => ({
	storage: {
		from() {
			return {
				async upload(filePath, body, options = {}) {
					try {
						const { normalized, localPath } = getLocalPath(filePath);
						await fs.mkdir(path.dirname(localPath), { recursive: true });

						const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
						try {
							await fs.writeFile(localPath, buffer, { flag: options.upsert ? "w" : "wx" });
						} catch (writeError) {
							if (writeError?.code === "EEXIST") {
								return {
									data: null,
									error: { message: "File already exists", code: "LOCAL_DUPLICATE" },
								};
							}
							throw writeError;
						}
						await fs.writeFile(
							`${localPath}.meta.json`,
							JSON.stringify({ contentType: options.contentType || "application/octet-stream" }),
						);

						return { data: { path: normalized }, error: null };
					} catch (error) {
						return { data: null, error };
					}
				},

				async download(filePath) {
					try {
						const { localPath } = getLocalPath(filePath);
						const [buffer, metadata] = await Promise.all([
							fs.readFile(localPath),
							readMetadata(localPath),
						]);

						return {
							data: createLocalDownloadData(
								buffer,
								metadata.contentType || "application/octet-stream",
							),
							error: null,
						};
					} catch (error) {
						return { data: null, error };
					}
				},

				async list(prefix = "", options = {}) {
					try {
						const safePrefix = prefix ? normalizeStoragePath(prefix) : "";
						const dirPath = safePrefix
							? path.resolve(LOCAL_STORAGE_DIR, ...safePrefix.split("/"))
							: LOCAL_STORAGE_DIR;
						const entries = await fs.readdir(dirPath, { withFileTypes: true });
						const items = await Promise.all(
							entries
								.filter((entry) => !entry.name.endsWith(".meta.json"))
								.map(async (entry) => {
									const stats = await fs.stat(path.join(dirPath, entry.name));
									return statToStorageItem(entry.name, stats);
								}),
						);

						const offset = options.offset || 0;
						const limit = options.limit || items.length;
						return { data: items.slice(offset, offset + limit), error: null };
					} catch (error) {
						if (error.code === "ENOENT") {
							return { data: [], error: null };
						}
						return { data: null, error };
					}
				},

				async remove(filePaths) {
					try {
						for (const filePath of filePaths) {
							const { localPath } = getLocalPath(filePath);
							await fs.rm(localPath, { force: true, recursive: true });
							await fs.rm(`${localPath}.meta.json`, { force: true });
						}
						return { data: filePaths, error: null };
					} catch (error) {
						return { data: null, error };
					}
				},
			};
		},
	},
});

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
	const SUPABASE_TIMEOUT_MS = 5000;

	const fetchWithTimeout = async (url, options = {}) => {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
		try {
			return await fetch(url, { ...options, signal: controller.signal });
		} finally {
			clearTimeout(timeoutId);
		}
	};

	supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
		global: { fetch: fetchWithTimeout },
	});
} else {
	console.warn(
		"⚠️ Supabase client not initialized — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
	);
}

if (!supabase) {
	if (process.env.NODE_ENV === "production" && process.env.ENABLE_LOCAL_STORAGE_FALLBACK !== "true") {
		throw new Error("Supabase is not initialized; refusing local storage fallback in production.");
	}
	console.warn("Using local file storage fallback for generated files.");
	supabase = createLocalStorageClient();
}

module.exports = { supabase };
