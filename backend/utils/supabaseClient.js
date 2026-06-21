const { createClient } = require("@supabase/supabase-js");

let supabase = null;

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

module.exports = { supabase };
