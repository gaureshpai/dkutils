import React, { useState, useContext, useRef } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const PdfCompressor = () => {
  const { trackToolUsage } = useAnalytics();

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file && file.type === "application/pdf") {
      if (file.size > maxFileSize) {
        toast.error(
          `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
        );
        setSelectedFile(null);
        e.target.value = null;
      } else {
        setSelectedFile(file);
      }
    } else {
      toast.error("Please select a PDF file.");
      setSelectedFile(null);
      e.target.value = null;
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please select a PDF file.");
      return;
    }

    setLoading(true);
    trackToolUsage("PdfCompressor", "pdf");
    const formData = new FormData();
    formData.append("pdf", selectedFile);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/compress-pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "json",
        },
      );

      const { path, originalname } = res.data;

      const link = document.createElement("a");
      link.href = path;
      link.setAttribute("download", originalname);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg || "Error compressing PDF. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">PDF Compressor</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="single_file"
          >
            Upload a PDF file
          </label>
          <input
            ref={fileInputRef}
            className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-muted/30 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
            id="single_file"
            type="file"
            onChange={onFileChange}
            accept=".pdf"
          />
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Compressing..." : "Compress PDF"}
        </button>
      </form>
    </div>
  );
};

export default PdfCompressor;
