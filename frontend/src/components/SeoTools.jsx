import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const SeoTools = () => {
  const { trackToolUsage } = useAnalytics();

  const [domain, setDomain] = useState("");
  const [robotsTxtContent, setRobotsTxtContent] = useState("");
  const [sitemapXmlContent, setSitemapXmlContent] = useState("");
  const [robotsTxtError, setRobotsTxtError] = useState(null);
  const [sitemapXmlError, setSitemapXmlError] = useState(null);
  const [loadingRobots, setLoadingRobots] = useState(false);
  const [loadingSitemap, setLoadingSitemap] = useState(false);

  const handleDomainChange = (e) => {
    setDomain(e.target.value);
    setRobotsTxtContent("");
    setSitemapXmlContent("");
    setRobotsTxtError(null);
    setSitemapXmlError(null);
  };

  const copyToClipboard = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy to clipboard. Please try again.");
    }
  };

  const fetchRobotsTxt = async () => {
    // Early return if domain is empty
    if (!domain?.trim()) {
      return;
    }

    setLoadingRobots(true);
    setRobotsTxtContent("");
    setRobotsTxtError(null);
    trackToolUsage("SeoTools:robots_txt", "web");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/seo/robots-txt`,
        { domain },
      );
      if (res.data.exists) {
        setRobotsTxtContent(res.data.content);
        trackToolUsage("SeoTools:robots_txt_success", "web");
        toast.success("robots.txt fetched successfully!");
      } else {
        setRobotsTxtError(
          res.data.error || "robots.txt not found or accessible.",
        );
        setRobotsTxtContent("");
        trackToolUsage("SeoTools:robots_txt_not_found", "web");
        toast.info("robots.txt not found or accessible.");
      }
    } catch (err) {
      console.error("Error fetching robots.txt:", err);
      setRobotsTxtError(
        err.response?.data?.msg || "Failed to fetch robots.txt.",
      );
      trackToolUsage("SeoTools:robots_txt_error", "web");
      toast.error(err.response?.data?.msg || "Failed to fetch robots.txt.");
    } finally {
      setLoadingRobots(false);
    }
  };

  const fetchSitemapXml = async () => {
    // Early return if domain is empty
    if (!domain?.trim()) {
      return;
    }

    setLoadingSitemap(true);
    setSitemapXmlContent("");
    setSitemapXmlError(null);
    trackToolUsage("SeoTools:sitemap_xml", "web");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/seo/sitemap-xml`,
        { domain },
      );
      if (res.data.exists) {
        setSitemapXmlContent(res.data.content);
        trackToolUsage("SeoTools:sitemap_xml_success", "web");
        toast.success("sitemap.xml fetched successfully!");
      } else {
        setSitemapXmlContent(
          res.data.error || "sitemap.xml not found or accessible.",
        );
        trackToolUsage("SeoTools:sitemap_xml_not_found", "web");
        toast.info("sitemap.xml not found or accessible.");
      }
    } catch (err) {
      console.error("Error fetching sitemap.xml:", err);
      setSitemapXmlError(
        err.response?.data?.msg || "Failed to fetch sitemap.xml.",
      );
      trackToolUsage("SeoTools:sitemap_xml_error", "web");
      toast.error(err.response?.data?.msg || "Failed to fetch sitemap.xml.");
    } finally {
      setLoadingSitemap(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">
        Robots.txt / Sitemap.xml Viewer
      </h2>
      <div className="mb-4">
        <label
          htmlFor="domainInput"
          className="block mb-2 text-sm font-medium text-foreground"
        >
          Domain (e.g., example.com)
        </label>
        <input
          type="text"
          id="domainInput"
          className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          placeholder="e.g., example.com"
          value={domain}
          onChange={handleDomainChange}
          required
        />
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={fetchRobotsTxt}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loadingRobots || !domain?.trim()}
        >
          {loadingRobots ? "Fetching..." : "Fetch robots.txt"}
        </button>
        <button
          type="button"
          onClick={fetchSitemapXml}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loadingSitemap || !domain?.trim()}
        >
          {loadingSitemap ? "Fetching..." : "Fetch sitemap.xml"}
        </button>
      </div>

      {robotsTxtError && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
          {robotsTxtError}
        </div>
      )}

      {robotsTxtContent && (
        <div className="mt-4 p-4 border rounded-md bg-background shadow">
          <h3 className="text-xl font-bold mb-2">
            robots.txt Content:
            <button
              type="button"
              onClick={() => copyToClipboard(robotsTxtContent)}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Copy robots.txt content to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline-block"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </h3>
          <textarea
            className="w-full px-3 py-2 bg-muted/30 border border-input rounded-md text-foreground text-sm h-max"
            rows="10"
            readOnly
            value={robotsTxtContent}
          ></textarea>
        </div>
      )}

      {sitemapXmlError && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
          {sitemapXmlError}
        </div>
      )}

      {sitemapXmlContent && (
        <div className="mt-4 p-4 border rounded-md bg-background shadow">
          <h3 className="text-xl font-bold mb-2">
            sitemap.xml Content:
            <button
              type="button"
              onClick={() => copyToClipboard(sitemapXmlContent)}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Copy sitemap.xml content to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline-block"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </h3>
          <textarea
            className="w-full px-3 py-2 bg-muted/30 border border-input rounded-md text-foreground text-sm h-max"
            rows="10"
            readOnly
            value={sitemapXmlContent}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default SeoTools;
