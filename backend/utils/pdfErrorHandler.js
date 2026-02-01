/**
 * Enhanced error handler for PDF operations
 * Provides user-friendly error messages and detailed logging
 */

const handlePdfError = (err, operation = "PDF operation") => {
  console.error(`Error during ${operation}:`, err);
  const msg =
    typeof err?.message === "string" ? err.message : String(err || "");
  console.error("Error message:", msg);
  console.error("Error stack:", err?.stack);

  // Categorize errors and provide user-friendly messages
  let userMessage =
    "An error occurred while processing your PDF. Please try again.";
  let statusCode = 500;

  if (msg.includes("Invalid PDF")) {
    userMessage =
      "The uploaded file is not a valid PDF. Please upload a valid PDF file.";
    statusCode = 400;
  } else if (msg.includes("encrypted") || msg.includes("password")) {
    userMessage =
      "This PDF is password-protected. Please remove the password and try again.";
    statusCode = 400;
  } else if (msg.includes("corrupted") || msg.includes("damaged")) {
    userMessage =
      "The PDF file appears to be corrupted. Please try a different file.";
    statusCode = 400;
  } else if (msg.includes("page range") || msg.includes("page number")) {
    userMessage = msg; // Use the specific error message for page range errors
    statusCode = 400;
  } else if (msg.includes("file size") || msg.includes("too large")) {
    userMessage =
      "The file is too large. Please try a smaller file or login for higher limits.";
    statusCode = 413;
  } else if (msg.includes("memory") || msg.includes("heap")) {
    userMessage =
      "The file is too complex to process. Please try a simpler PDF or split it into smaller parts.";
    statusCode = 413;
  } else if (err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT") {
    userMessage =
      "Unable to connect to storage service. Please try again later.";
    statusCode = 503;
  }

  return {
    message: userMessage,
    statusCode,
    originalError: process.env.NODE_ENV === "development" ? msg : undefined,
  };
};

/**
 * Validate PDF file before processing
 */
const validatePdfFile = (file) => {
  if (!file) {
    throw new Error("No PDF file uploaded.");
  }

  if (file.mimetype !== "application/pdf") {
    throw new Error("Invalid file type. Only PDF files are allowed.");
  }

  // Check if buffer exists and has content
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error("The uploaded file is empty or corrupted.");
  }

  return true;
};

/**
 * Validate page ranges for PDF operations
 */
const validatePageRange = (ranges, totalPages) => {
  if (!ranges || ranges.trim() === "") {
    throw new Error("No page ranges provided.");
  }

  const pageRanges = ranges.split(",").map((r) => r.trim());
  const pageNumbers = [];

  pageRanges.forEach((range) => {
    if (range.includes("-")) {
      const [start, end] = range.split("-").map((n) => parseInt(n, 10));
      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error(
          `Invalid page range: ${range}. Please use numbers only.`,
        );
      }
      if (start < 1 || end > totalPages) {
        throw new Error(
          `Page range ${range} is out of bounds. PDF has ${totalPages} pages.`,
        );
      }
      if (start > end) {
        throw new Error(
          `Invalid page range: ${range}. Start page must be less than or equal to end page.`,
        );
      }
      for (let i = start; i <= end; i += 1) {
        pageNumbers.push(i - 1);
      }
    } else {
      const pageNum = parseInt(range, 10);
      if (Number.isNaN(pageNum)) {
        throw new Error(
          `Invalid page number: ${range}. Please use numbers only.`,
        );
      }
      if (pageNum < 1 || pageNum > totalPages) {
        throw new Error(
          `Page ${pageNum} is out of bounds. PDF has ${totalPages} pages.`,
        );
      }
      pageNumbers.push(pageNum - 1);
    }
  });

  return pageNumbers;
};

/**
 * Wrap async route handlers with error handling
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  handlePdfError,
  validatePdfFile,
  validatePageRange,
  asyncHandler,
};
