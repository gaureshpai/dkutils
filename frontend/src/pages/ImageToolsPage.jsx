import ToolCard from '../components/ToolCard.jsx';
import PngToJpgConverter from '../components/PngToJpgConverter.jsx';
import ImageToPdfConverter from '../components/ImageToPdfConverter.jsx';
import ImageResizer from '../components/ImageResizer.jsx';
import ImageCompressor from '../components/ImageCompressor.jsx';
import ImageFormatConverter from '../components/ImageFormatConverter.jsx';
import ImageCropper from '../components/ImageCropper.jsx';
import ImageGrayscaler from '../components/ImageGrayscaler.jsx';
import ImageFlipper from '../components/ImageFlipper.jsx';
import ImageToBase64Converter from '../components/ImageToBase64Converter.jsx';
import { Helmet } from 'react-helmet-async';

const ImageToolsPage = () => {
  return (
    <>
      <Helmet>
        <title>Image Tools - Utility Hub</title>
        <meta name="description" content="Explore our comprehensive suite of online image manipulation tools: Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, Image Flipper, and Image to Base64 Converter. Optimize, transform, and enhance your images with ease."/>
        <meta name="keywords" content="image tools, image converter, image compressor, image resizer, image to PDF, PNG to JPG, image cropper, image grayscaler, image flipper, image to Base64, online image editor, photo editor, image optimization, convert image format, compress photos, resize images, crop images, grayscale image, flip image, Base64 image converter, free image tools"/>
        <meta property="og:title" content="Image Tools - Utility Hub"/>
        <meta property="og:description" content="Explore our comprehensive suite of online image manipulation tools: Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, Image Flipper, and Image to Base64 Converter. Optimize, transform, and enhance your images with ease."/>
        <meta property="og:image" content="https://dkutils.vercel.app/logo.png"/>
        <meta property="og:url" content="https://dkutils.vercel.app/images"/>
      </Helmet>
      <main className="container mx-auto py-10 px-4">
      <h2 className="text-3xl font-bold mb-2 text-blue-500">Image Tools</h2>
      <p className="text-lg text-muted-foreground mb-6">A suite of tools for image manipulation and conversion.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ToolCard title="Image Format Converter" description="Convert images between various formats (JPG, PNG, WebP, TIFF).">
          <ImageFormatConverter />
        </ToolCard>
        <ToolCard title="Image Compressor" description="Reduce the file size of your images.">
          <ImageCompressor />
        </ToolCard>
        <ToolCard title="Image Resizer" description="Change the dimensions of your images.">
          <ImageResizer />
        </ToolCard>
        <ToolCard title="Image to PDF Converter" description="Combine multiple images into a single PDF document.">
          <ImageToPdfConverter />
        </ToolCard>
        <ToolCard title="PNG to JPG Converter" description="Quickly convert PNG images to JPG format.">
          <PngToJpgConverter />
        </ToolCard>
        <ToolCard title="Image Cropper" description="Crop images to a specific area.">
          <ImageCropper />
        </ToolCard>
        <ToolCard title="Image Grayscaler" description="Convert your images to grayscale.">
          <ImageGrayscaler />
        </ToolCard>
        <ToolCard title="Image Flipper" description="Flip images horizontally or vertically.">
          <ImageFlipper />
        </ToolCard>
        <ToolCard title="Image to Base64 Converter" description="Convert images to Base64 strings.">
          <ImageToBase64Converter />
        </ToolCard>
      </div>
    </main>
  </>
  );
};

export default ImageToolsPage;