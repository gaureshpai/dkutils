const { createClient } = require("@supabase/supabase-js");

// Fail fast during startup when required Supabase configuration is missing.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
	console.error(
		"Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
	);
	throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = { supabase };
