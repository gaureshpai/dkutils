import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useAnalytics from "../utils/useAnalytics";

const TextToPdfGenerator = () => {
  const { trackToolUsage } = useAnalytics();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setText(e.target.value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    trackToolUsage("TextToPdfGenerator", "pdf");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/text-to-pdf`,
        { text },
        {
          responseType: "blob",
        },
      );

      const zipBlob = new Blob([res.data], { type: "application/zip" });

      const url = window.URL.createObjectURL(zipBlob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `converted-text-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF generated successfully!");
      setText("");
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg ||
          "Error generating PDF from text. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Text to PDF Generator</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label
            htmlFor="text-input"
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Text to convert to PDF
          </label>
          <textarea
            id="text-input"
            className="w-full px-3 py-2 placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-background"
            rows="10"
            placeholder="Enter text here..."
            value={text}
            onChange={onChange}
          ></textarea>
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate PDF"}
        </button>
      </form>
    </div>
  );
};

export default TextToPdfGenerator;
