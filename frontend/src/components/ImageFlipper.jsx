import React, { useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext.jsx";
import useAnalytics from "../utils/useAnalytics";

const ImageFlipper = () => {
  const { trackToolUsage } = useAnalytics();

  const {
    state: { isAuthenticated },
  } = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const [flipDirection, setFlipDirection] = useState("horizontal");
  const [loading, setLoading] = useState(false);

  const onFileChange = (e) => {
    const file = e.target.files[0];
    const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (file && file.type.startsWith("image/")) {
      if (file.size > maxFileSize) {
        toast.error(
          `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
        );
        setSelectedFile(null);
        e.target.value = null;
      } else {
        setSelectedFile(file);
      }
    } else {
      setSelectedFile(null);
      toast.error("Please select an image file.");
      e.target.value = "";
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an image file first.");
      return;
    }

    setLoading(true);
    trackToolUsage("ImageFlipper", "image");
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("direction", flipDirection);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/convert/image-flip`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const { path, originalname } = res.data;

      const link = document.createElement("a");
      link.href = path;
      link.setAttribute("download", originalname);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.msg || "Error flipping image. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Image Flipper</h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <label
            className="block mb-2 text-sm font-medium text-foreground"
            htmlFor="image_file"
          >
            Upload Image
          </label>
          <input
            className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-muted/30 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
            id="image_file"
            type="file"
            onChange={onFileChange}
            accept="image/*"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="flip-direction"
            className="block mb-2 text-sm font-medium text-foreground"
          >
            Flip Direction:
          </label>
          <select
            id="flip-direction"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-background"
            value={flipDirection}
            onChange={(e) => setFlipDirection(e.target.value)}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </div>
        <button
          type="submit"
          className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
          disabled={loading}
        >
          {loading ? "Flipping..." : "Flip Image"}
        </button>
      </form>
    </div>
  );
};

export default ImageFlipper;
