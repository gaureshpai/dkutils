import React, { useState } from "react";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const Base64TextConverter = () => {
  const { trackToolUsage } = useAnalytics();

  const [text, setText] = useState("");
  const [convertedText, setConvertedText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const encodeBase64 = () => {
    setLoading(true);
    trackToolUsage("Base64TextConverter", "text");
    setTimeout(() => {
      setConvertedText(btoa(text));
      setLoading(false);
    }, 500);
  };

  const decodeBase64 = () => {
    setLoading(true);
    trackToolUsage("Base64TextConverter", "text");
    setTimeout(() => {
      try {
        setConvertedText(atob(text));
      } catch (e) {
        setConvertedText("Invalid Base64 string");
      }
      setLoading(false);
    }, 500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(convertedText);
    toast.success("Copied to clipboard!");
  };

  const downloadAsTxt = () => {
    const blob = new Blob([convertedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `converted-text-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Base64 Text Encoder/Decoder</h2>
      <div className="mb-4">
        <textarea
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          rows="5"
          placeholder="Enter text or Base64 string..."
          value={text}
          onChange={handleTextChange}
        ></textarea>
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={encodeBase64}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Encoding..." : "Encode Base64"}
        </button>
        <button
          type="button"
          onClick={decodeBase64}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Decoding..." : "Decode Base64"}
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
                <title>Copy to clipboard</title>
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={downloadAsTxt}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Download converted text as TXT file"
            >
              Download TXT
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

export default Base64TextConverter;
