import React, { useState } from "react";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const JsonFormatterValidator = () => {
  const { trackToolUsage } = useAnalytics();

  const [jsonInput, setJsonInput] = useState("");
  const [formattedJson, setFormattedJson] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setJsonInput(e.target.value);
    setFormattedJson("");
    setValidationMessage("");
  };

  const formatJson = () => {
    setLoading(true);
    trackToolUsage("JsonFormatterValidator", "web");
    try {
      const parsedJson = JSON.parse(jsonInput);
      setFormattedJson(JSON.stringify(parsedJson, null, 2));
      setValidationMessage("Valid JSON");
    } catch (e) {
      setFormattedJson("");
      setValidationMessage(`Invalid JSON: ${e.message}`);
    }
    setLoading(false);
  };

  const validateJson = () => {
    setLoading(true);
    trackToolUsage("JsonFormatterValidator", "web");
    try {
      JSON.parse(jsonInput);
      setValidationMessage("Valid JSON");
    } catch (e) {
      setValidationMessage(`Invalid JSON: ${e.message}`);
    }
    setLoading(false);
  };

  const copyToClipboard = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard!");
  };

  const downloadJson = () => {
    const element = document.createElement("a");
    const file = new Blob([formattedJson], { type: "application/json" });
    const url = URL.createObjectURL(file);
    element.href = url;
    element.download = "formatted.json";
    document.body.appendChild(element);
    element.click();

    // Clean up: remove element and revoke URL to prevent memory leak
    setTimeout(() => {
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">JSON Formatter & Validator</h2>
      <div className="mb-4">
        <textarea
          className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          rows="10"
          placeholder="Enter JSON here..."
          value={jsonInput}
          onChange={handleInputChange}
        ></textarea>
      </div>
      <div className="mb-4">
        <button
          type="button"
          onClick={formatJson}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Formatting..." : "Format JSON"}
        </button>
        <button
          type="button"
          onClick={validateJson}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Validating..." : "Validate JSON"}
        </button>
      </div>

      {validationMessage && (
        <div
          className={`mt-4 p-3 rounded-md ${validationMessage.startsWith("Valid") ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"}`}
        >
          {validationMessage}
        </div>
      )}

      {formattedJson && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">
            Formatted JSON:
            <button
              type="button"
              onClick={() => copyToClipboard(formattedJson)}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Copy formatted JSON to clipboard"
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
              onClick={downloadJson}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Download formatted JSON as file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline-block"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <title>Download file</title>
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </h3>
          <textarea
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
            rows="10"
            readOnly
            value={formattedJson}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default JsonFormatterValidator;
