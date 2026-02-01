import React, { useState } from "react";
import { toast } from "react-toastify";
import md5 from "js-md5";
import useAnalytics from "../utils/useAnalytics";

const HashGenerator = () => {
  const { trackToolUsage } = useAnalytics();

  const [text, setText] = useState("");
  const [hashMd5, setHashMd5] = useState("");
  const [hashSha256, setHashSha256] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTextChange = (e) => {
    setText(e.target.value);
    setHashMd5("");
    setHashSha256("");
  };

  const generateHash = async (algorithm) => {
    setLoading(true);
    trackToolUsage("HashGenerator", "web");
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(text);

    try {
      let hashBuffer;
      if (algorithm === "MD5") {
        setHashMd5(md5(text));
      } else if (algorithm === "SHA-256") {
        hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexHash = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setHashSha256(hexHash);
      }
    } catch (error) {
      console.error("Error generating hash:", error);
      toast.error("Failed to generate hash.");
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
      <h2 className="text-2xl font-bold mb-4">Hash Generator</h2>
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
          onClick={() => generateHash("MD5")}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate MD5"}
        </button>
        <button
          onClick={() => generateHash("SHA-256")}
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate SHA256"}
        </button>
      </div>

      {hashMd5 && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">
            MD5 Hash:
            <button
              onClick={() => copyToClipboard(hashMd5)}
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
          <textarea
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
            rows="1"
            readOnly
            value={hashMd5}
          ></textarea>
        </div>
      )}

      {hashSha256 && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">
            SHA256 Hash:
            <button
              onClick={() => copyToClipboard(hashSha256)}
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
          <textarea
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
            rows="1"
            readOnly
            value={hashSha256}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default HashGenerator;
