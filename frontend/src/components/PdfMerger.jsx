import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const PdfMerger = () => {
  const { trackToolUsage } = useAnalytics();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  // eslint-disable-next-line no-unused-vars
  const [convertedFile, setConvertedFile] = useState(null);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    const validFiles = [];
    let hasError = false;

    files.forEach((file) => {
      if (file.type !== "application/pdf") {
        toast.error(
          `Invalid file type: ${file.name}. Only PDF files are allowed.`,
        );
        hasError = true;
        return;
      }
      if (file.size > maxFileSize) {
        toast.error(
          `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
        );
        hasError = true;
        return;
      }
      validFiles.push(file);
    });

    setSelectedFiles(validFiles);
    if (hasError) {
      e.target.value = "";
      setError("Some files were not added due to size or type restrictions.");
    } else {
      setError("");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one PDF file.");
      return;
    }

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("pdfs", file);
    }

    setLoading(true);
    trackToolUsage("PdfMerger", "pdf");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/merge-pdfs`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setConvertedFile(res.data);

      handleDownload(res.data.path, res.data.originalname);
      trackToolUsage("PDF Merger", "pdf");
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg || "Error merging PDFs. Please try again.",
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
      <h2 className="text-2xl font-bold mb-4">PDF Merger</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="multiple_files"
          >
            Upload multiple PDF files
          </label>
          <input
            ref={fileInputRef}
            className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
            id="multiple_files"
            type="file"
            multiple
            onChange={onFileChange}
            accept=".pdf"
          />
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Merging..." : "Merge PDFs"}
        </button>
      </form>
    </div>
  );
};

export default PdfMerger;
