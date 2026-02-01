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

  // Check MIME type
  if (file.mimetype !== "application/pdf") {
    throw new Error("Invalid file type. Only PDF files are allowed.");
  }

  // Check if buffer exists and has content
  if (!file.buffer || file.buffer.length === 0) {
    throw new Error("The uploaded file is empty or corrupted.");
  }

  // Check minimum file size (PDF files should be at least a few hundred bytes)
  if (file.buffer.length < 100) {
    throw new Error("The uploaded file is too small to be a valid PDF.");
  }

  // Magic bytes validation for PDF files
  const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  const fileSignature = file.buffer.slice(0, 5);

  if (!pdfSignature.equals(fileSignature)) {
    throw new Error("Invalid PDF file signature. The file is not a valid PDF.");
  }

  // Additional validation: check for PDF version
  const pdfVersion = file.buffer.slice(5, 8).toString();
  const validVersions = [
    "1.0",
    "1.1",
    "1.2",
    "1.3",
    "1.4",
    "1.5",
    "1.6",
    "1.7",
    "2.0",
  ];

  if (!validVersions.includes(pdfVersion)) {
    throw new Error(
      `Unsupported PDF version: ${pdfVersion}. Please use a PDF with version 1.0-2.0.`,
    );
  }

  // Check for common PDF structure indicators with relaxed validation
  const bufferStr = file.buffer.toString(
    "utf8",
    0,
    Math.min(file.buffer.length, 1024),
  );

  // First validate PDF header
  if (!bufferStr.includes("%PDF")) {
    throw new Error("Invalid PDF file. Missing PDF header.");
  }

  // Check for PDF structure in a larger window, but don't throw hard error
  const largerBufferStr = file.buffer.toString(
    "utf8",
    0,
    Math.min(file.buffer.length, 65536), // 64KB window
  );

  if (!largerBufferStr.includes("obj") || !largerBufferStr.includes("endobj")) {
    console.warn(
      "PDF structure validation warning: obj/endobj not found in first 64KB. Proceeding with caution.",
    );
    // Don't throw error, allow parsing to continue
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

  // Deduplicate page numbers and sort them
  const uniquePageNumbers = [...new Set(pageNumbers)].sort((a, b) => a - b);

  return uniquePageNumbers;
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
