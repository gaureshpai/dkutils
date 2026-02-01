import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const FaviconExtractor = () => {
  const { trackToolUsage } = useAnalytics();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    trackToolUsage("FaviconExtractor", "web");
    setError(null);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/favicon`,
        { url },
      );
      const { path, originalname } = res.data;
      handleDownload(path, originalname);
    } catch (err) {
      console.error("Error extracting favicons:", err);
      setError(
        err.response?.data?.msg ||
          "Failed to extract favicons. Please check the URL and try again.",
      );
      toast.error(err.response?.data?.msg || "Failed to extract favicons.");
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
      <h2 className="text-2xl font-bold mb-4">Favicon Extractor</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="urlInput"
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Website URL
          </label>
          <input
            type="url"
            id="urlInput"
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
            placeholder="e.g., https://www.google.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Extracting..." : "Extract Favicons"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default FaviconExtractor;
