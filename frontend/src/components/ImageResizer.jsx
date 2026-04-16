import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import { useContext, useState } from "react";
import { toast } from "react-toastify";

/**
 * ImageResizer is a component that allows users to upload an image and resize it to a given width and height.
 * The component will display the original image and the resized image.
 * The component will also track the usage of the image resizer tool.
 *
 * @param {object} props - The component props.
 *
 * @returns {JSX.Element} - The JSX element representing the ImageResizer component.
 */
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

	/**
	 * Handles the file change event for the image resizer component.
	 * Checks if the selected file is an image file and if it is within the allowed file size limit.
	 * If the file is valid, sets the originalImage state to the selected file and displays the original image.
	 * If the file is invalid, displays an error message and resets the originalImage state.
	 * @param {React.ChangeEvent} e The file selection event.
	 */
	const handleFileChange = (e) => {
		const file = e.target.files[0];
		const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (!file) {
			setOriginalImage(null);
			setResizedImageSrc(null);
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("Invalid file type. Please upload an image file (e.g., JPEG, PNG, GIF).");
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
		/**
		 * Handles the onload event triggered by the FileReader after reading the original image file.
		 * Creates a new Image object and sets its onload event handler to update the originalDimensions state and set the newWidth and newHeight states to the original image dimensions.
		 * @param {React.ChangeEvent} event - The onload event triggered by the FileReader.
		 */
		reader.onload = (event) => {
			const img = new Image();
			/**
			 * Handles the onload event triggered by the Image object after loading the original image file.
			 * Sets the originalDimensions state to the original image dimensions and sets the newWidth and newHeight states to the original image dimensions.
			 */
			img.onload = () => {
				setOriginalDimensions({ width: img.width, height: img.height });
				setNewWidth(img.width.toString());
				setNewHeight(img.height.toString());
			};
			img.src = event.target.result;
		};
		reader.readAsDataURL(file);
	};

	/**
	 * Handles the resize event triggered by the ImageResizer component.
	 * Checks if the image has been uploaded and if the entered width and height are valid.
	 * If the image has been uploaded and the entered width and height are valid, sets the loading state to true and reads the image file.
	 * If the image has not been uploaded, displays an error message and resets the loading state.
	 * If the entered width and height are invalid, displays an error message and resets the loading state.
	 * If the image dimensions exceed the maximum allowed limits, displays an error message and resets the loading state.
	 * If the image size exceeds the maximum allowed pixels, displays an error message and resets the loading state.
	 * If the image file fails to read, displays an error message and resets the loading state.
	 * If the image fails to decode, displays an error message and resets the loading state.
	 * If the canvas is not supported in the browser, displays an error message and resets the loading state.
	 * If the image resizes successfully, sets the resizedImageSrc state to the resized image data URL, tracks the tool usage, and builds a filename from the original name (without extension) + derived extension.
	 * Finally, sets the loading state to false.
	 */
	const handleResize = () => {
		if (!originalImage) {
			toast.error("Please upload an image first.");
			return;
		}

		const MAX_DIMENSION = 10000;
		const MAX_PIXELS = 25000000;

		const width = Number.parseInt(newWidth, 10);
		const height = Number.parseInt(newHeight, 10);

		if (Number.isNaN(width) || Number.isNaN(height) || width <= 0 || height <= 0) {
			toast.error("Please enter valid positive numbers for width and height.");
			return;
		}

		if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
			toast.error(`Dimensions exceed maximum allowed (${MAX_DIMENSION}px).`);
			return;
		}

		if (width * height > MAX_PIXELS) {
			toast.error(`Image size exceeds maximum allowed (${MAX_PIXELS} pixels).`);
			return;
		}

		setLoading(true);

		const reader = new FileReader();
		/**
		 * Handles the onerror event triggered by the FileReader.
		 * Displays an error message and resets the loading state when the FileReader fails to read the image file.
		 */
		reader.onerror = () => {
			toast.error("Failed to read the image file.");
			setLoading(false);
		};

		/**
		 * Handles the onload event triggered by the FileReader.
		 * Decodes the uploaded image and validates its dimensions against the maximum allowed limits.
		 * If the dimensions exceed the limits, displays an error message and resets the loading state.
		 * Otherwise, resizes the image using a canvas element and sets the resized image source.
		 * Tracks tool usage and downloads the resized image if the user has not cancelled the operation.
		 */
		reader.onload = (event) => {
			const img = new Image();
			img.onerror = () => {
				toast.error("Failed to decode the uploaded image.");
				setLoading(false);
			};
			/**
			 * Handles the onload event triggered by the image element.
			 * Validates the dimensions of the uploaded image against the maximum allowed limits.
			 * If the dimensions exceed the limits, displays an error message and resets the loading state.
			 * Otherwise, resizes the image using a canvas element and sets the resized image source.
			 * Tracks tool usage and downloads the resized image if the user has not cancelled the operation.
			 */
			img.onload = () => {
				if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
					toast.error("Dimensions exceed maximum allowed limits.");
					setLoading(false);
					return;
				}
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					toast.error("Canvas is not supported in this browser.");
					setLoading(false);
					return;
				}
				ctx.drawImage(img, 0, 0, width, height);
				// Use a fixed output MIME type for canvas
				const outputMime = "image/png";
				const dataUrl = canvas.toDataURL(outputMime);
				setResizedImageSrc(dataUrl);
				trackToolUsage("ImageResizer", "image");

				// Extract MIME type from dataUrl and derive extension
				const mimeMatch = dataUrl.match(/data:([^;]+)/);
				const derivedMime = mimeMatch ? mimeMatch[1] : outputMime;
				const extension = derivedMime.split("/")[1] || "png";

				// Build filename from original name (without extension) + derived extension
				const originalNameWithoutExt = originalImage.name.split(".").slice(0, -1).join(".");
				const baseName = originalNameWithoutExt || "resized-image";
				handleDownload(dataUrl, `${baseName}-${Date.now()}.${extension}`);
				setLoading(false);
			};
			img.src = event.target.result;
		};
		reader.readAsDataURL(originalImage);
	};

	/**
	 * Downloads a file from the given URL and saves it with the given filename.
	 * @param {string} fileUrl - The URL of the file to download.
	 * @param {string} fileName - The filename to save the downloaded file as.
	 */
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

			{originalImage && (
				<div className="mb-4 p-4 border rounded-md bg-muted/30">
					<h3 className="text-xl font-semibold mb-2">Original Image</h3>
					<p className="text-sm text-muted-foreground mb-2">
						Name: {originalImage.name} | Type: {originalImage.type} | Size:{" "}
						{(originalImage.size / 1024).toFixed(2)} KB
					</p>
					<p className="text-sm text-muted-foreground mb-4">
						Dimensions: {originalDimensions.width} x {originalDimensions.height} pixels
					</p>

					<div className="flex space-x-4 mb-4">
						<div>
							<label htmlFor="newWidth" className="block text-sm font-medium text-muted-foreground">
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
