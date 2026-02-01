import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext.jsx";
import useAnalytics from "../utils/useAnalytics";

const ImageResizer = () => {
  const { trackToolUsage } = useAnalytics();

  const {
    state: { isAuthenticated },
  } = useContext(AuthContext);
  const [originalImage, setOriginalImage] = useState(null);
  const [newWidth, setNewWidth] = useState("");
  const [newHeight, setNewHeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [resizedImageSrc, setResizedImageSrc] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (!file) {
      setOriginalImage(null);
      setResizedImageSrc(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(
        "Invalid file type. Please upload an image file (e.g., JPEG, PNG, GIF).",
      );
      setOriginalImage(null);
      setResizedImageSrc(null);
      e.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      toast.error(
        `File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
      );
      setOriginalImage(null);
      setResizedImageSrc(null);
      e.target.value = "";
      return;
    }
    setOriginalImage(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ width: img.width, height: img.height });
        setNewWidth(img.width.toString());
        setNewHeight(img.height.toString());
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleResize = () => {
    if (!originalImage) {
      toast.error("Please upload an image first.");
      return;
    }

    const width = parseInt(newWidth);
    const height = parseInt(newHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      toast.error("Please enter valid positive numbers for width and height.");
      return;
    }

    setLoading(true);
    trackToolUsage("ImageResizer", "image");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(originalImage.type);
        setResizedImageSrc(dataUrl);

        handleDownload(
          dataUrl,
          `resized-${originalImage ? originalImage.name : "image"}`,
        );
        setLoading(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(originalImage);
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Image Resizer</h2>

      <div className="mb-4">
        <label
          className="block mb-2 text-sm font-medium text-foreground"
          htmlFor="image_file"
        >
          Upload Image
        </label>
        <input
          className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
          id="image_file"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {originalImage && (
        <div className="mb-4 p-4 border rounded-md bg-muted/30">
          <h3 className="text-xl font-semibold mb-2">Original Image</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Name: {originalImage.name} | Type: {originalImage.type} | Size:{" "}
            {(originalImage.size / 1024).toFixed(2)} KB
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Dimensions: {originalDimensions.width} x {originalDimensions.height}{" "}
            pixels
          </p>

          <div className="flex space-x-4 mb-4">
            <div>
              <label
                htmlFor="newWidth"
                className="block text-sm font-medium text-muted-foreground"
              >
                New Width (px)
              </label>
              <input
                type="number"
                id="newWidth"
                className="mt-1 block w-full p-2 border border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-primary"
                value={newWidth}
                onChange={(e) => setNewWidth(e.target.value)}
                placeholder="e.g., 300"
              />
            </div>
            <div>
              <label
                htmlFor="newHeight"
                className="block text-sm font-medium text-muted-foreground"
              >
                New Height (px)
              </label>
              <input
                type="number"
                id="newHeight"
                className="mt-1 block w-full p-2 border border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-primary"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
                placeholder="e.g., 200"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleResize}
            className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
            disabled={loading}
          >
            {loading ? "Resizing..." : "Resize Image"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageResizer;
