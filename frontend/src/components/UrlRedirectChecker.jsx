import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Copy } from "lucide-react";
import useAnalytics from "../utils/useAnalytics";

const UrlRedirectChecker = () => {
  const { trackToolUsage } = useAnalytics();

  const [url, setUrl] = useState("");
  const [redirectChain, setRedirectChain] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const copyToClipboard = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy to clipboard. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    trackToolUsage("UrlRedirectChecker", "web");
    setRedirectChain([]);
    setError(null);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/redirect-checker`,
        { url },
      );
      setRedirectChain(res.data.chain);
      toast.success("Redirect chain retrieved successfully!");
    } catch (err) {
      console.error("Error checking redirects:", err);
      setError(
        err.response?.data?.msg ||
          "Failed to check redirects. Please check the URL and try again.",
      );
      toast.error(err.response?.data?.msg || "Failed to check redirects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">URL Redirect Checker</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="urlInput"
            className="block mb-2 text-sm font-medium text-foreground"
          >
            URL to Check
          </label>
          <input
            type="url"
            id="urlInput"
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
            placeholder="e.g., https://bit.ly/example"
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
          {loading ? "Checking..." : "Check Redirects"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {redirectChain.length > 0 && (
        <div className="mt-4 p-4 border rounded-md bg-background shadow">
          <h3 className="text-xl font-bold mb-2">Redirect Chain:</h3>
          <ol className="list-decimal list-inside">
            {redirectChain.map((step, index) => (
              <li key={index} className="mb-1 flex items-center">
                <span className="font-semibold">{step.status}</span>:{" "}
                <a
                  href={step.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all mr-2"
                >
                  {step.url}
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(step.url)}
                  className="text-sm text-primary hover:underline"
                  aria-label="Copy URL to clipboard"
                >
                  <Copy className="h-5 w-5 inline-block" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default UrlRedirectChecker;
