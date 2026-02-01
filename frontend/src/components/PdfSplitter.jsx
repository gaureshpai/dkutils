import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import axios from "axios";
import { toast } from "react-toastify";
import { PDFDocument } from "pdf-lib";
import useAnalytics from "../utils/useAnalytics";

const PdfSplitter = () => {
  const { trackToolUsage } = useAnalytics();

  const [selectedFile, setSelectedFile] = useState(null);
  const [ranges, setRanges] = useState("");
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (!file) {
      setSelectedFile(null);
      setTotalPages(0);
      setError("");
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error(
        `Invalid file type: ${file.name}. Only PDF files are allowed.`,
      );
      setSelectedFile(null);
      setTotalPages(0);
      e.target.value = "";
      setError("Invalid file type.");
      return;
    }
    if (file.size > maxFileSize) {
      toast.error(
        `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
      );
      setSelectedFile(null);
      setTotalPages(0);
      e.target.value = "";
      setError("File too large.");
      return;
    }

    setError("");
    setSelectedFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
    } catch (err) {
      console.error("Error reading PDF for page count:", err);
      toast.error(
        "Could not read PDF for page count. It might be corrupted or encrypted.",
      );
      setSelectedFile(null);
      setTotalPages(0);
      e.target.value = "";
      setError("PDF read error.");
    }
  };

  const onRangeChange = (e) => {
    setRanges(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please upload a PDF file.");
      return;
    }
    if (!ranges) {
      toast.error("Please enter page ranges to split.");
      return;
    }

    if (totalPages > 0) {
      const parts = ranges.split(",").map((p) => p.trim());
      let isValidRange = true;
      let coveredPages = new Set();

      for (const part of parts) {
        if (part.includes("-")) {
          const [start, end] = part.split("-").map(Number);
          if (
            isNaN(start) ||
            isNaN(end) ||
            start <= 0 ||
            end > totalPages ||
            start > end
          ) {
            isValidRange = false;
            break;
          }
          for (let i = start; i <= end; i++) {
            coveredPages.add(i);
          }
        } else {
          const pageNum = Number(part);
          if (isNaN(pageNum) || pageNum <= 0 || pageNum > totalPages) {
            isValidRange = false;
            break;
          }
          coveredPages.add(pageNum);
        }
      }

      if (!isValidRange) {
        toast.error(
          `Invalid page ranges. Please ensure all pages are within 1-${totalPages} and ranges are correctly formatted.`,
        );
        return;
      }
    }

    setLoading(true);
    trackToolUsage("PdfSplitter", "pdf");

    const formData = new FormData();
    formData.append("pdf", selectedFile);
    formData.append("ranges", ranges);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/split-pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      handleDownload(res.data.path, res.data.originalname);
      setSelectedFile(null);
      setRanges("");
      setTotalPages(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg || "Failed to split PDF. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">PDF Splitter</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4 py-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="single_file"
          >
            Upload a PDF file
          </label>
          <input
            ref={fileInputRef}
            className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
            id="single_file"
            type="file"
            onChange={onFileChange}
            accept=".pdf"
          />
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          {selectedFile && totalPages > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Total pages: {totalPages}
            </p>
          )}
        </div>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="ranges"
          >
            Page Ranges (e.g. 1, 3-5, 8)
          </label>
          <input
            type="text"
            id="ranges"
            className="mt-1 block w-full p-2 border bg-background border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-primary"
            placeholder="e.g., 1, 3-5, 8"
            value={ranges}
            onChange={onRangeChange}
          />
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Splitting..." : "Split PDF"}
        </button>
      </form>
    </div>
  );
};

export default PdfSplitter;
