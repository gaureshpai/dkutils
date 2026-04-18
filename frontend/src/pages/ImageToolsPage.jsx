// import ImageToBase64Converter from "@frontend/components/ImageToBase64Converter.jsx";
import ImageBackgroundRemover from "@frontend/components/ImageBackgroundRemover.jsx";
import ImageCompressor from "@frontend/components/ImageCompressor.jsx";
import ImageCropper from "@frontend/components/ImageCropper.jsx";
import ImageFlipper from "@frontend/components/ImageFlipper.jsx";
import ImageFormatConverter from "@frontend/components/ImageFormatConverter.jsx";
import ImageGrayscaler from "@frontend/components/ImageGrayscaler.jsx";
import ImageResizer from "@frontend/components/ImageResizer.jsx";
import ImageToPdfConverter from "@frontend/components/ImageToPdfConverter.jsx";
import PngToJpgConverter from "@frontend/components/PngToJpgConverter.jsx";
import ToolCard from "@frontend/components/ToolCard.jsx";
import useSortedTools from "@frontend/utils/useSortedTools";
import { Helmet } from "react-helmet-async";

const IMAGE_TOOL_DEFINITIONS = [
	{
		title: "Image Format Converter",
		description: "Convert images between various formats (JPG, PNG, WebP, TIFF).",
		component: ImageFormatConverter,
	},
	{
		title: "Image Compressor",
		description: "Reduce the file size of your images.",
		component: ImageCompressor,
	},
	{
		title: "Image Resizer",
		description: "Change the dimensions of your images.",
		component: ImageResizer,
	},
	{
		title: "Background Remover",
		description: "Remove backgrounds from product shots, portraits, and logos.",
		component: ImageBackgroundRemover,
	},
	{
		title: "Image to PDF Converter",
		description: "Combine multiple images into a single PDF document.",
		component: ImageToPdfConverter,
	},
	{
		title: "PNG to JPG Converter",
		description: "Quickly convert PNG images to JPG format.",
		component: PngToJpgConverter,
	},
	{
		title: "Image Cropper",
		description: "Crop images to a specific area.",
		component: ImageCropper,
	},
	{
		title: "Image Grayscaler",
		description: "Convert your images to grayscale.",
		component: ImageGrayscaler,
	},
	{
		title: "Image Flipper",
		description: "Flip images horizontally or vertically.",
		component: ImageFlipper,
	},
	// {
	//   title: "Image to Base64 Converter",
	//   description: "Convert images to Base64 strings.",
	//   component: ImageToBase64Converter,
	// },
];

/**
 * A page containing a suite of online image manipulation tools: Image Background Remover (Make Transparent), Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, and Image Flipper. Optimize, transform, and enhance your images with ease.
 */
/**
 * Keywords: image tools, image background removed, remove background, transparent background, image converter, image compressor, image resizer, image to PDF, PNG to JPG, image cropper, image grayscaler, image flipper, online image editor, photo editor, image optimization, convert image format, compress photos, resize images, crop images, grayscale image, free image tools
 */
const ImageToolsPage = () => {
	const { tools, isLoading } = useSortedTools("image", IMAGE_TOOL_DEFINITIONS);

	return (
		<>
			<Helmet>
				<title>Image Tools - dkutils</title>
				<meta
					name="description"
					content="Explore our comprehensive suite of online image manipulation tools: Image Background Remover (Make Transparent), Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, and Image Flipper. Optimize, transform, and enhance your images with ease."
				/>
				<meta
					name="keywords"
					content="image tools, image background remover, remove background, transparent background, image converter, image compressor, image resizer, image to PDF, PNG to JPG, image cropper, image grayscaler, image flipper, online image editor, photo editor, image optimization, convert image format, compress photos, resize images, crop images, grayscale image, free image tools"
				/>
				<meta property="og:title" content="Image Tools - dkutils" />
				<meta
					property="og:description"
					content="Explore our comprehensive suite of online image manipulation tools: Image Background Remover (Make Transparent), Image Format Converter (JPG, PNG, WebP, TIFF, AVIF), Image Compressor, Image Resizer, Image to PDF Converter, PNG to JPG Converter, Image Cropper, Image Grayscaler, and Image Flipper. Optimize, transform, and enhance your images with ease."
				/>
				<meta property="og:image" content="https://dkutils.vercel.app/logo.png" />
				<meta property="og:url" content="https://dkutils.vercel.app/images" />
			</Helmet>
			<main className="container mx-auto py-10 px-4">
				<h2 className="text-3xl font-bold mb-2 text-primary">Image Tools</h2>
				<p className="text-lg text-muted-foreground mb-6">
					A suite of tools for image manipulation and conversion.
				</p>

				{isLoading ? (
					<div className="flex justify-center items-center h-64">
						<div
							className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
							aria-label="Loading image tools"
						>
							<span className="sr-only">Loading image tools…</span>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{tools.map((tool) => (
							<ToolCard key={tool.title} title={tool.title} description={tool.description}>
								{(() => {
									const Component = tool.component;
									return <Component />;
								})()}
							</ToolCard>
						))}
					</div>
				)}
			</main>
		</>
	);
};

export default ImageToolsPage;
