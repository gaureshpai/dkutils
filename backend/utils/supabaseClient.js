const { createClient } = require("@supabase/supabase-js");

// Fail fast during startup when required Supabase configuration is missing.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
	console.error(
		"Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
	);
	throw new Error("Missing required Supabase environment variables");
}

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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
	global: { fetch: fetchWithTimeout },
});

module.exports = { supabase };
