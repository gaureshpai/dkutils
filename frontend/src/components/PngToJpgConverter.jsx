import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const PngToJpgConverter = () => {
  const { trackToolUsage } = useAnalytics();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  // eslint-disable-next-line no-unused-vars
  const [convertedZipFile, setConvertedZipFile] = useState(null);

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = ["image/png"];
    const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    const validFiles = [];
    let hasInvalidFile = false;

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `Invalid file type: ${file.name}. Only PNG images are allowed.`,
        );
        hasInvalidFile = true;
        return;
      }
      if (file.size > maxSize) {
        toast.error(
          `File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
        );
        hasInvalidFile = true;
        return;
      }
      validFiles.push(file);
    });

    setSelectedFiles(validFiles);
    if (hasInvalidFile) {
      e.target.value = "";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one PNG file.");
      return;
    }

    setLoading(true);
    trackToolUsage("PngToJpgConverter", "image");
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("images", file);
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/png-to-jpg`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setConvertedZipFile(res.data);

      handleDownload(res.data.path, res.data.originalname);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg ||
        "Error converting PNG to JPG. Please try again.",
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
      <h2 className="text-2xl font-bold mb-4">PNG to JPG Converter</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="multiple_files"
          >
            Upload multiple files
          </label>
          <input
            accept=".png"
            className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
            id="multiple_files"
            type="file"
            multiple
            onChange={onFileChange}
          />
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Converting..." : "Convert"}
        </button>
      </form>
    </div>
  );
};

export default PngToJpgConverter;
