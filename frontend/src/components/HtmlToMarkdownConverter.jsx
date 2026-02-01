import React, { useState } from "react";
import TurndownService from "turndown";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const HtmlToMarkdownConverter = () => {
  const { trackToolUsage } = useAnalytics();

  const [html, setHtml] = useState("");
  const [markdown, setMarkdown] = useState("");

  const turndownService = new TurndownService();

  const handleHtmlChange = (e) => {
    setHtml(e.target.value);
    setMarkdown(turndownService.turndown(e.target.value));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">HTML to Markdown Converter</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground text-foreground">
            HTML Input
          </label>
          <textarea
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm h-max"
            rows="10"
            placeholder="Enter HTML here..."
            value={html}
            onChange={handleHtmlChange}
          ></textarea>
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground text-foreground">
            Markdown Output
            <button
              onClick={copyToClipboard}
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
          </label>
          <textarea
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm h-max"
            rows="10"
            readOnly
            value={markdown}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default HtmlToMarkdownConverter;
