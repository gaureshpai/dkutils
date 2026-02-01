import React, { useState } from "react";
import { marked } from "marked";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const MarkdownToHtmlConverter = () => {
  const { trackToolUsage } = useAnalytics();

  const [markdown, setMarkdown] = useState("");
  const [html, setHtml] = useState("");
  const [hasTracked, setHasTracked] = useState(false);

  const handleMarkdownChange = (e) => {
    const newMarkdown = e.target.value;
    setMarkdown(newMarkdown);
    setHtml(marked(newMarkdown));

    // Track usage on copy action
    if (!hasTracked && newMarkdown.trim().length > 0) {
      trackToolUsage("MarkdownToHtmlConverter", "web");
      setHasTracked(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(html);
    toast.success("Copied to clipboard!");
    // Track usage on copy action if not already tracked
    if (!hasTracked) {
      trackToolUsage("MarkdownToHtmlConverter", "web");
      setHasTracked(true);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Markdown to HTML Converter</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="markdownInput"
            className="block mb-2 text-sm font-medium text-foreground text-foreground"
          >
            Markdown Input
          </label>
          <textarea
            id="markdownInput"
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm h-max"
            rows="10"
            placeholder="Enter Markdown here..."
            value={markdown}
            onChange={handleMarkdownChange}
          ></textarea>
        </div>
        <div>
          <label
            htmlFor="htmlOutput"
            className="block mb-2 text-sm font-medium text-foreground text-foreground"
          >
            HTML Output
            <button
              type="button"
              onClick={copyToClipboard}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Copy HTML to clipboard"
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
          </label>
          <textarea
            id="htmlOutput"
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm h-max"
            rows="10"
            readOnly
            value={html}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default MarkdownToHtmlConverter;
