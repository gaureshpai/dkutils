import React, { useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext.jsx";
import useAnalytics from "../utils/useAnalytics";

const ImageFormatConverter = () => {
  const { trackToolUsage } = useAnalytics();
  const {
    state: { isAuthenticated },
  } = useContext(AuthContext);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [format, setFormat] = useState("jpeg");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [convertedZipFile, setConvertedZipFile] = useState(null);

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/tiff",
      "image/avif",
    ];
    const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    const validFiles = [];
    let hasInvalidFile = false;

    files.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          `Invalid file type: ${file.name}. Only images (JPEG, PNG, GIF, WebP, TIFF, AVIF) are allowed.`,
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

  const onFormatChange = (e) => {
    setFormat(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one image file.");
      return;
    }

    setLoading(true);
    trackToolUsage("ImageFormatConverter", "image");
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("images", file);
    }
    formData.append("format", format);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/convert-image-format`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      setConvertedZipFile(res.data);

      handleDownload(res.data.path, res.data.originalname);
      trackToolUsage("Image Format Converter", "image");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg ||
          "Error converting image format. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Image Format Converter</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="multiple_files"
          >
            Upload image files (any format)
          </label>
          <input
            accept="image/*"
            className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
            id="multiple_files"
            type="file"
            multiple
            onChange={onFileChange}
          />
        </div>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="format"
          >
            Target Format
          </label>
          <select
            id="format"
            className="bg-background border border-input text-foreground text-sm rounded-lg focus:ring-blue-500 focus:border-primary block w-full p-2.5 dark:placeholder-gray-400 dark:focus:ring-blue-500 dark:focus:border-primary"
            value={format}
            onChange={onFormatChange}
          >
            <option value="avif">AVIF</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="tiff">TIFF</option>
            <option value="webp">WebP</option>
            <option value="gif">GIF</option>
          </select>
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Converting..." : "Convert Format"}
        </button>
      </form>
    </div>
  );
};

export default ImageFormatConverter;
