require("dotenv").config();

const mongoose = require("mongoose");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL) {
  console.error("Error: SUPABASE_URL environment variable is not set.");
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.",
  );
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("Error: MONGO_URI environment variable is not set.");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Export supabase client for reuse in other modules
module.exports.supabase = supabase;

const testSupabaseConnection = async () => {
  try {
    const { data: bucket, error: getBucketError } =
      await supabase.storage.getBucket("utilityhub");
    if (getBucketError) throw getBucketError;
    console.log(`Supabase Storage connected!\nBucket '${bucket.name}' found.`);
  } catch (error) {
    console.error("Supabase Storage connection failed:", error.message);
  }
};

mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("MongoDB connected!");
  testSupabaseConnection();
});

const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const apiActivityTracker = require("./middleware/apiActivityTracker");
const authMiddleware = require("./middleware/auth");
const uploadLimiter = require("./middleware/uploadLimiter");

app.use(apiActivityTracker);

const shortener = require("./routes/shortener");

app.use(shortener);

const imageConverter = require("./routes/imageConverter");

app.use("/api/convert", authMiddleware, uploadLimiter, imageConverter);

const pdfConverter = require("./routes/pdfConverter");

app.use("/api/convert", authMiddleware, uploadLimiter, pdfConverter);

const textToPdf = require("./routes/textToPdf");

app.use("/api/convert", authMiddleware, uploadLimiter, textToPdf);

const officeConverter = require("./routes/officeConverter");

app.use("/api/convert", authMiddleware, uploadLimiter, officeConverter);

const textConverter = require("./routes/textConverter");

app.use("/api/convert", textConverter);

const auth = require("./routes/auth");

app.use("/api/auth", auth);

const keepAlive = require("./routes/keepAlive");

app.use("/api/keep-alive", authMiddleware, keepAlive);

const cleanSupabase = require("./routes/cleanSupabase");

app.use("/api/clean-supabase", authMiddleware, cleanSupabase);

const screenshot = require("./routes/screenshot");

app.use("/api/screenshot", authMiddleware, uploadLimiter, screenshot);

const favicon = require("./routes/favicon");

app.use("/api/favicon", authMiddleware, uploadLimiter, favicon);

const redirectChecker = require("./routes/redirectChecker");

app.use("/api/redirect-checker", redirectChecker);

const jsonXmlConverter = require("./routes/jsonXmlConverter");

app.use("/api/convert", jsonXmlConverter);

const seoTools = require("./routes/seoTools");

app.use("/api/seo", seoTools);

const analytics = require("./routes/analytics");

app.use("/api/analytics", analytics);

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

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
