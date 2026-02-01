import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import ToolCard from "../components/ToolCard.jsx";
import PngToJpgConverter from "../components/PngToJpgConverter.jsx";
import ImageToPdfConverter from "../components/ImageToPdfConverter.jsx";
import ImageResizer from "../components/ImageResizer.jsx";
import ImageCompressor from "../components/ImageCompressor.jsx";
import ImageFormatConverter from "../components/ImageFormatConverter.jsx";
import ImageCropper from "../components/ImageCropper.jsx";
import ImageGrayscaler from "../components/ImageGrayscaler.jsx";
import ImageFlipper from "../components/ImageFlipper.jsx";
import ImageToBase64Converter from "../components/ImageToBase64Converter.jsx";
import useAnalytics from "../utils/useAnalytics";

const ImageToolsPage = () => {
  const { getToolStats } = useAnalytics();
  const [tools, setTools] = useState([]);

  useEffect(() => {
    const fetchAndSortTools = async () => {
      const initialTools = [
        {
          title: "Image Format Converter",
          description:
            "Convert images between various formats (JPG, PNG, WebP, TIFF).",
          component: <ImageFormatConverter />,
        },
        {
          title: "Image Compressor",
          description: "Reduce the file size of your images.",
          component: <ImageCompressor />,
        },
        {
          title: "Image Resizer",
          description: "Change the dimensions of your images.",
          component: <ImageResizer />,
        },
        {
          title: "Image to PDF Converter",
          description: "Combine multiple images into a single PDF document.",
          component: <ImageToPdfConverter />,
        },
        {
          title: "PNG to JPG Converter",
          description: "Quickly convert PNG images to JPG format.",
          component: <PngToJpgConverter />,
        },
        {
          title: "Image Cropper",
          description: "Crop images to a specific area.",
          component: <ImageCropper />,
        },
        {
          title: "Image Grayscaler",
          description: "Convert your images to grayscale.",
          component: <ImageGrayscaler />,
        },
        {
          title: "Image Flipper",
          description: "Flip images horizontally or vertically.",
          component: <ImageFlipper />,
        },
        {
          title: "Image to Base64 Converter",
          description: "Convert images to Base64 strings.",
          component: <ImageToBase64Converter />,
        },
      ];

      try {
        const stats = await getToolStats("image");

        // Create a map of usage counts
        const usageMap = {};
        stats.forEach((stat) => {
          usageMap[stat.toolName] = stat.usageCount;
        });

        // Sort tools based on usage count (descending)
        const sortedTools = [...initialTools].sort((a, b) => {
          const usageA = usageMap[a.title] || 0;
          const usageB = usageMap[b.title] || 0;
          return usageB - usageA;
        });

        setTools(sortedTools);
      } catch (error) {
        console.error("Failed to sort tools:", error);
        setTools(initialTools);
      }
    };

    fetchAndSortTools();
  }, [getToolStats]);

  return (
    <>
      <Helmet>
        <title>Image Tools - dkutils</title>
        <meta
          name="description"
          content="Explore our comprehensive suite of online image manipulation tools: Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, Image Flipper, and Image to Base64 Converter. Optimize, transform, and enhance your images with ease."
        />
        <meta
          name="keywords"
          content="image tools, image converter, image compressor, image resizer, image to PDF, PNG to JPG, image cropper, image grayscaler, image flipper, image to Base64, online image editor, photo editor, image optimization, convert image format, compress photos, resize images, crop images, grayscale image, flip image, Base64 image converter, free image tools"
        />
        <meta property="og:title" content="Image Tools - dkutils" />
        <meta
          property="og:description"
          content="Explore our comprehensive suite of online image manipulation tools: Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, Image Flipper, and Image to Base64 Converter. Optimize, transform, and enhance your images with ease."
        />
        <meta
          property="og:image"
          content="https://dkutils.vercel.app/logo.png"
        />
        <meta property="og:url" content="https://dkutils.vercel.app/images" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-primary">Image Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">
          A suite of tools for image manipulation and conversion.
        </p>

        {tools.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
              role="status"
              aria-label="Loading image tools"
            >
              <span className="sr-only">Loading image tools…</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <ToolCard
                key={index}
                title={tool.title}
                description={tool.description}
              >
                {tool.component}
              </ToolCard>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default ImageToolsPage;
