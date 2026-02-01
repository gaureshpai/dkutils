import React, { useState } from "react";
import { diff_match_patch } from "diff-match-patch";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const TextDifferenceChecker = () => {
  const { trackToolUsage } = useAnalytics();

  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [diffResult, setDiffResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleText1Change = (e) => {
    setText1(e.target.value);
  };

  const handleText2Change = (e) => {
    setText2(e.target.value);
  };

  const compareTexts = () => {
    setLoading(true);
    trackToolUsage("TextDifferenceChecker", "text");
    setTimeout(() => {
      const dmp = new diff_match_patch();
      const diff = dmp.diff_main(text1, text2);
      dmp.diff_cleanupSemantic(diff);

      const html = diff
        .map((part) => {
          const [type, text] = part;
          if (type === 0) {
            return text;
          } else if (type === 1) {
            return `<span class="bg-chart-2/20">${text}</span>`;
          } else if (type === -1) {
            return `<span class="bg-destructive/20">${text}</span>`;
          }
          return "";
        })
        .join("");

      setDiffResult(html);
      setLoading(false);
    }, 500);
  };

  const copyToClipboard = () => {
    const tempElement = document.createElement("div");
    tempElement.innerHTML = diffResult;
    navigator.clipboard.writeText(tempElement.innerText);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Text Difference Checker</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground">
            Text 1
          </label>
          <textarea
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm h-max"
            rows="10"
            placeholder="Enter first text..."
            value={text1}
            onChange={handleText1Change}
          ></textarea>
        </div>
        <div>
          <label className="block mb-2 text-sm font-medium text-foreground">
            Text 2
          </label>
          <textarea
            className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm h-max"
            rows="10"
            placeholder="Enter second text..."
            value={text2}
            onChange={handleText2Change}
          ></textarea>
        </div>
      </div>
      <button
        onClick={compareTexts}
        className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
        disabled={loading}
      >
        {loading ? "Comparing..." : "Compare Texts"}
      </button>

      {diffResult && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">
            Differences:
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
          </h3>
          <div
            className="bg-background border border-input text-foreground text-sm rounded-lg block w-full p-2.5 h-max"
            dangerouslySetInnerHTML={{ __html: diffResult }}
          ></div>
        </div>
      )}
    </div>
  );
};

export default TextDifferenceChecker;
