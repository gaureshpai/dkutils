require("module-alias/register");
require("dotenv").config();

const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");
const { migrateTotalUsageKey } = require("@backend/scripts/migrateTotalUsageKey");

if (!process.env.SUPABASE_URL) {
	console.error("Error: SUPABASE_URL environment variable is not set.");
	process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
	console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.");
	process.exit(1);
}
if (!process.env.MONGO_URI) {
	console.error("Error: MONGO_URI environment variable is not set.");
	process.exit(1);
}
if (!process.env.SUPABASE_CLEANUP_CRON_SECRET) {
	console.error("Error: SUPABASE_CLEANUP_CRON_SECRET environment variable is not set.");
	process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const testSupabaseConnection = async () => {
	try {
		const { data: bucket, error: getBucketError } = await supabase.storage.getBucket("utilityhub");
		if (getBucketError) throw getBucketError;
		console.log(`Supabase Storage connected!\nBucket '${bucket.name}' found.`);
	} catch (error) {
		console.error("Supabase Storage connection failed:", error.message);
	}
};

const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const apiActivityTracker = require("@backend/middleware/apiActivityTracker");
const authMiddleware = require("@backend/middleware/auth");
const uploadLimiter = require("@backend/middleware/uploadLimiter");

app.use(apiActivityTracker);

const shortener = require("@backend/routes/shortener");

app.use(shortener);

const imageConverter = require("@backend/routes/imageConverter");

app.use("/api/convert", authMiddleware, uploadLimiter, imageConverter);

const pdfConverter = require("@backend/routes/pdfConverter");

app.use("/api/convert", authMiddleware, uploadLimiter, pdfConverter);

const textToPdf = require("@backend/routes/textToPdf");

app.use("/api/convert", authMiddleware, uploadLimiter, textToPdf);

const officeConverter = require("@backend/routes/officeConverter");

app.use("/api/convert", authMiddleware, uploadLimiter, officeConverter);

const textConverter = require("@backend/routes/textConverter");

app.use("/api/convert", textConverter);

const auth = require("@backend/routes/auth");

app.use("/api/auth", auth);

const keepAlive = require("@backend/routes/keepAlive");

app.use("/api/keep-alive", authMiddleware, keepAlive);

const cleanSupabase = require("@backend/routes/cleanSupabase");

app.use("/api/clean-supabase", cleanSupabase);

const screenshot = require("@backend/routes/screenshot");

app.use("/api/screenshot", authMiddleware, uploadLimiter, screenshot);

const favicon = require("@backend/routes/favicon");

app.use("/api/favicon", authMiddleware, uploadLimiter, favicon);

const redirectChecker = require("@backend/routes/redirectChecker");

app.use("/api/redirect-checker", redirectChecker);

const jsonXmlConverter = require("@backend/routes/jsonXmlConverter");

app.use("/api/convert", jsonXmlConverter);

const seoTools = require("@backend/routes/seoTools");

app.use("/api/seo", seoTools);

const analytics = require("@backend/routes/analytics");

app.use("/api/analytics", analytics);

const passwordStrength = require("@backend/routes/passwordStrength");

app.use("/api/password-strength", passwordStrength);

app.get("/", (req, res) => {
	res.send("Hello from dkutils Backend!");
});

app.get("/health", (req, res) => {
	res.status(200).send("Backend is healthy!");
});

// Global error handling middleware
app.use((err, req, res, next) => {
	console.error(err);
	res.status(err.status || 500).json({
		msg: err.message || "Server error",
	});
});

const startServer = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("MongoDB connected!");
		await migrateTotalUsageKey();
		await testSupabaseConnection();

		app.listen(port, () => {
			console.log(`Server is running on port: ${port}`);
		});
	} catch (error) {
		console.error("Failed to start backend:", error);
		process.exit(1);
	}
};

startServer();
