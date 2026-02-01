const { createClient } = require("@supabase/supabase-js");

// Validate Supabase environment variables before creating client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
  // Don't exit process - let the error be handled by middleware
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

module.exports = { supabase };
