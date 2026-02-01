import React, { useState } from "react";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const TextCaseConverter = () => {
  const { trackToolUsage } = useAnalytics();

  const [text, setText] = useState("");
  const [convertedText, setConvertedText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const toUpperCase = () => {
    setLoading(true);
    trackToolUsage("TextCaseConverter", "text");
    setTimeout(() => {
      setConvertedText(text.toUpperCase());
      setLoading(false);
    }, 500);
  };

  const toLowerCase = () => {
    setLoading(true);
    trackToolUsage("TextCaseConverter", "text");
    setTimeout(() => {
      setConvertedText(text.toLowerCase());
      setLoading(false);
    }, 500);
  };

  const toTitleCase = () => {
    setLoading(true);
    trackToolUsage("TextCaseConverter", "text");
    setTimeout(() => {
      setConvertedText(
        text.replace(/\w\S*/g, (txt) => {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }),
      );
      setLoading(false);
    }, 500);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(convertedText);
      toast.success("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy to clipboard. Please try again.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Text Case Converter</h2>
      <div className="mb-4">
        <textarea
          className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          rows="5"
          placeholder="Enter text here..."
          value={text}
          onChange={handleTextChange}
        ></textarea>
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={toUpperCase}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Converting..." : "UPPERCASE"}
        </button>
        <button
          type="button"
          onClick={toLowerCase}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Converting..." : "lowercase"}
        </button>
        <button
          type="button"
          onClick={toTitleCase}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Converting..." : "Title Case"}
        </button>
      </div>
      {convertedText && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">
            Converted Text:
            <button
              type="button"
              onClick={copyToClipboard}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Copy converted text to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline-block"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>Copy converted text</title>
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </h3>
          <textarea
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
            rows="10"
            readOnly
            value={convertedText}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default TextCaseConverter;
