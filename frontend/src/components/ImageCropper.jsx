import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import { useContext, useRef, useState, useEffect } from "react";
import { toast } from "react-toastify";

const ImageCropper = () => {
	const { trackToolUsage } = useAnalytics();

	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
	const [imageSrc, setImageSrc] = useState(null);
	const [croppedImageSrc, setCroppedImageSrc] = useState(null);
	const [originalMimeType, setOriginalMimeType] = useState(null);
	const [loading, setLoading] = useState(false);
	const imageRef = useRef(null);
	const canvasRef = useRef(null);

	// Cleanup object URLs to prevent memory leaks
	useEffect(() => {
		return () => {
			if (imageSrc && imageSrc.startsWith("blob:")) {
				URL.revokeObjectURL(imageSrc);
			}
			if (croppedImageSrc && croppedImageSrc.startsWith("blob:")) {
				URL.revokeObjectURL(croppedImageSrc);
			}
		};
	}, [imageSrc, croppedImageSrc]);

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (!file) {
			setImageSrc(null);
			setCroppedImageSrc(null);
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("Invalid file type. Please upload an image file (e.g., JPEG, PNG, GIF).");
			setImageSrc(null);
			setCroppedImageSrc(null);
			e.target.value = "";
			return;
		}

		if (file.size > maxSize) {
			const message = isAuthenticated
				? `File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB.`
				: `File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`;
			toast.error(message);
			setImageSrc(null);
			setCroppedImageSrc(null);
			e.target.value = "";
			return;
		}

		// Revoke previous blob URL if exists
		if (imageSrc && imageSrc.startsWith("blob:")) {
			URL.revokeObjectURL(imageSrc);
		}

		// Use blob URL instead of FileReader for better performance and to avoid race conditions
		const blobUrl = URL.createObjectURL(file);
		setImageSrc(blobUrl);
		setCroppedImageSrc(null);
		setOriginalMimeType(file.type);
	};

	const handleCrop = () => {
		if (!imageSrc) {
			toast.error("Please upload an image first.");
			return;
		}

		try {
			trackToolUsage("ImageCropper", "image");
			const image = imageRef.current;
			const canvas = canvasRef.current;

			if (!image || !canvas) {
				toast.error("Image or canvas reference is missing.");
				return;
			}

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				toast.error("Could not get canvas context.");
				return;
			}

			if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
				toast.error("Image is still loading. Please try again in a moment.");
				return;
			}

			setLoading(true);

			const cropX = image.naturalWidth * 0.25;
			const cropY = image.naturalHeight * 0.25;
			const cropWidth = image.naturalWidth * 0.5;
			const cropHeight = image.naturalHeight * 0.5;

			canvas.width = cropWidth;
			canvas.height = cropHeight;

			ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
			const mimeType = originalMimeType || "image/png";

			// Use toBlob for better performance and memory efficiency
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						toast.error("Failed to create image blob.");
						setLoading(false);
						return;
					}

					// Revoke previous object URL if exists
					if (croppedImageSrc && croppedImageSrc.startsWith("blob:")) {
						URL.revokeObjectURL(croppedImageSrc);
					}

					const objectUrl = URL.createObjectURL(blob);
					setCroppedImageSrc(objectUrl);

					const extension = mimeType.split("/")[1] || "png";
					handleDownload(objectUrl, `dkutils-cropped-image-${Date.now()}.${extension}`);
					setLoading(false);
				},
				mimeType,
			);
			return; // Exit early since toBlob is async
		} catch (error) {
			console.error("Cropping error:", error);
			toast.error("An error occurred during cropping.");
			setLoading(false);
		}
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
			<h2 className="text-2xl font-bold mb-4">Image Cropper</h2>

			<div className="mb-4">
				<label className="block mb-2 text-sm font-medium text-foreground" htmlFor="image_file">
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

			{imageSrc && (
				<div className="mb-4 p-4 border rounded-md bg-muted/30">
					<h3 className="text-xl font-semibold mb-2">Original Image Preview</h3>
					<img
						ref={imageRef}
						src={imageSrc}
						alt="Original"
						className="max-w-full h-auto border rounded-md mb-4"
					/>
					<button
						type="button"
						onClick={handleCrop}
						className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
						disabled={loading}
					>
						{loading ? "Cropping..." : "Crop Image (Center 50%)"}
					</button>
				</div>
			)}
			<canvas ref={canvasRef} style={{ display: "none" }} />
		</div>
	);
};

export default ImageCropper;