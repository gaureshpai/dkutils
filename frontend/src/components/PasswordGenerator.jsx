import React, { useState } from "react";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const PasswordGenerator = () => {
  const { trackToolUsage } = useAnalytics();

  const [password, setPassword] = useState("");
  const [length, setLength] = useState(12);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [loading, setLoading] = useState(false);

  const generatePassword = () => {
    setLoading(true);
    setTimeout(() => {
      let charset = "";
      let newPassword = "";

      if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
      if (includeNumbers) charset += "0123456789";
      if (includeSymbols) charset += "!@#$%^&*()_+-=[]{};:,.<>?";

      if (charset === "") {
        setPassword("Please select at least one option.");
        setLoading(false);
        return;
      }

      // Use Web Crypto API for cryptographically secure random generation
      const randomValues = new Uint32Array(length);
      crypto.getRandomValues(randomValues);

      for (let i = 0; i < length; i++) {
        newPassword += charset.charAt(randomValues[i] % charset.length);
      }
      setPassword(newPassword);
      setLoading(false);
      // Track usage only after successful generation
      trackToolUsage("PasswordGenerator", "web");
    }, 500);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error(`Unable to copy: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Password Generator</h2>
      <div className="mb-4">
        <label
          htmlFor="lengthInput"
          className="block mb-2 text-sm font-medium text-foreground"
        >
          Password Length:
        </label>
        <input
          id="lengthInput"
          type="number"
          className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          value={length}
          onChange={(e) => setLength(parseInt(e.target.value, 10))}
          min="4"
          max="32"
        />
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={includeUppercase}
            onChange={() => setIncludeUppercase(!includeUppercase)}
          />
          <span className="ml-2 text-foreground">
            Include Uppercase Letters
          </span>
        </label>
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={includeLowercase}
            onChange={() => setIncludeLowercase(!includeLowercase)}
          />
          <span className="ml-2 text-foreground">
            Include Lowercase Letters
          </span>
        </label>
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={includeNumbers}
            onChange={() => setIncludeNumbers(!includeNumbers)}
          />
          <span className="ml-2 text-foreground">
            Include Numbers
          </span>
        </label>
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={includeSymbols}
            onChange={() => setIncludeSymbols(!includeSymbols)}
          />
          <span className="ml-2 text-foreground">
            Include Symbols
          </span>
        </label>
      </div>
      <button
        type="button"
        onClick={generatePassword}
        className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Password"}
      </button>

      {password && (
        <div className="mt-4">
          <h3 className="text-xl font-bold mb-2">
            Generated Password:
            <button
              type="button"
              onClick={copyToClipboard}
              className="ml-2 text-sm text-primary hover:underline"
              aria-label="Copy password to clipboard"
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
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
            rows="1"
            readOnly
            value={password}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default PasswordGenerator;
