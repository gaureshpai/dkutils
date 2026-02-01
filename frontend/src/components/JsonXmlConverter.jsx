import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const JsonXmlConverter = () => {
  const { trackToolUsage } = useAnalytics();

  const [inputData, setInputData] = useState("");
  const [outputData, setOutputData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setInputData(e.target.value);
    setOutputData("");
    setError(null);
  };

  const copyToClipboard = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
    toast.success("Copied to clipboard!");
  };

  const convertJsonToXml = async () => {
    setLoading(true);
    trackToolUsage("JsonXmlConverter", "web");
    setOutputData("");
    setError(null);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/json-to-xml`,
        { jsonString: inputData },
      );
      setOutputData(res.data.xmlString);
      toast.success("JSON converted to XML successfully!");
    } catch (err) {
      console.error("Error converting JSON to XML:", err);
      setError(
        err.response?.data?.msg ||
          "Failed to convert JSON to XML. Please check your input.",
      );
      toast.error(err.response?.data?.msg || "Failed to convert JSON to XML.");
    } finally {
      setLoading(false);
    }
  };

  const convertXmlToJson = async () => {
    setLoading(true);
    trackToolUsage("JsonXmlConverter", "web");
    setOutputData("");
    setError(null);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/xml-to-json`,
        { xmlString: inputData },
      );
      setOutputData(res.data.jsonString);
      toast.success("XML converted to JSON successfully!");
    } catch (err) {
      console.error("Error converting XML to JSON:", err);
      setError(
        err.response?.data?.msg ||
          "Failed to convert XML to JSON. Please check your input.",
      );
      toast.error(err.response?.data?.msg || "Failed to convert XML to JSON.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">
        JSON &lt;-&gt; XML Converter for Web Data
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-md bg-background shadow">
          <label
            htmlFor="inputData"
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Input (JSON or XML for Web Services)
          </label>
          <textarea
            id="inputData"
            className="w-full px-3 py-2 placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-background min-h-[200px] overflow-auto"
            placeholder="Enter JSON or XML data for web services, APIs, etc."
            value={inputData}
            onChange={handleInputChange}
          ></textarea>
          <div className="mt-4 flex justify-center space-x-2">
            <button
              type="button"
              onClick={convertJsonToXml}
              className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 dark:hover:bg-primary focus:outline-none "
              disabled={loading}
            >
              {loading ? "Converting..." : "JSON to XML"}
            </button>
            <button
              type="button"
              onClick={convertXmlToJson}
              className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 dark:hover:bg-primary focus:outline-none "
              disabled={loading}
            >
              {loading ? "Converting..." : "XML to JSON"}
            </button>
          </div>
        </div>
        <div className="p-4 border rounded-md bg-background shadow">
          <label
            htmlFor="outputData"
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Output
            {outputData && (
              <button
                type="button"
                onClick={() => copyToClipboard(outputData)}
                className="ml-2 text-sm text-primary hover:underline"
                aria-label="Copy output to clipboard"
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
            )}
          </label>
          <textarea
            id="outputData"
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm min-h-[200px] overflow-auto"
            readOnly
            value={outputData}
          ></textarea>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default JsonXmlConverter;
