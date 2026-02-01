import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const LinkShortener = () => {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { trackToolUsage } = useAnalytics();

  const onChange = (e) => {
    setOriginalUrl(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await trackToolUsage("Link Shortener", "web");
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/shorten`,
        { originalUrl },
      );
      setShortUrl(res.data.shortUrl);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg || "Error shortening URL. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Link Shortener</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Enter URL"
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
            value={originalUrl}
            onChange={onChange}
          />
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>

      {shortUrl && (
        <div className="mt-4 bg-background p-4 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-2">
            Shortened URL:
            <button
              onClick={() => copyToClipboard(shortUrl)}
              className="ml-2 text-sm text-primary hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline-block"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </h3>
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {shortUrl}
          </a>
        </div>
      )}
    </div>
  );
};

export default LinkShortener;
