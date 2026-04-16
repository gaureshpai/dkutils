import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * Component for converting images to PDF.
 *
 * It takes in a list of image files, and uploads them to the API to convert the images to PDF.
 * It then downloads the converted PDF.
 *
 * @return {JSX.Element} The component.
 */
const ImageToPdfConverter = () => {
	const { trackToolUsage } = useAnalytics();

	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [loading, setLoading] = useState(false);
	const [convertedFile, setConvertedFile] = useState(null);
	const conversionIdRef = useRef(0);

	/**
	 * Handles file change event for image to PDF converter.
	 * Checks if the selected files are valid image files (JPEG, PNG, GIF, WebP, TIFF, AVIF)
	 * and if they are within the allowed file size limit.
	 * If the files are valid, sets the selectedFiles state to the valid files.
	 * If the files are invalid, displays an error message and resets the selectedFiles state.
	 * @param {React.ChangeEvent<HTMLInputElement>} e - The file change event.
	 */
	const onFileChange = (e) => {
		setConvertedFile(null);
		setLoading(false);
		// Increment conversion ID to invalidate any pending requests when files change
		conversionIdRef.current += 1;
		const files = Array.from(e.target.files);
		const allowedTypes = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/tiff",
			"image/avif",
		];
		const maxSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		const validFiles = [];

		for (const file of files) {
			if (!allowedTypes.includes(file.type)) {
				toast.error(
					`Invalid file type: ${file.name}. Only images (JPEG, PNG, GIF, WebP, TIFF, AVIF) are allowed.`,
				);
				setSelectedFiles([]);
				e.target.value = "";
				return;
			}
			if (file.size > maxSize) {
				const message = isAuthenticated
					? `File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB.`
					: `File too large: ${file.name}. Maximum size is ${maxSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`;
				toast.error(message);
				setSelectedFiles([]);
				e.target.value = "";
				return;
			}
			validFiles.push(file);
		}

		setSelectedFiles(validFiles);
	};

	const onSubmit = async (e) => {
		e.preventDefault();

		if (selectedFiles.length === 0) {
			toast.error("Please select at least one image file.");
			return;
		}

		// Increment conversion ID to track this specific conversion
		conversionIdRef.current += 1;
		const myId = conversionIdRef.current;
		const filesSnapshot = [...selectedFiles];

		setConvertedFile(null);
		setLoading(true);
		const formData = new FormData();
		for (const file of filesSnapshot) {
			formData.append("images", file);
		}

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/image-to-pdf`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);

			// Only apply results if this is still the current conversion
			if (myId === conversionIdRef.current) {
				setConvertedFile(res.data);
				handleDownload(res.data.path, res.data.originalname);
				toast.success("Images converted to PDF successfully!");
				trackToolUsage("ImageToPdfConverter", "image");
			}
		} catch (err) {
			console.error(err);
			// Only show error if this is still the current conversion
			if (myId === conversionIdRef.current) {
				setConvertedFile(null);
				toast.error(err.response?.data?.msg || "Error converting images to PDF. Please try again.");
			}
		} finally {
			// Only update loading state if this is still the current conversion
			if (myId === conversionIdRef.current) {
				setLoading(false);
			}
		}
	};

	/**
	 * Downloads a file from the given URL and saves it with the given filename.
	 * @param {string} fileUrl - The URL of the file to download.
	 * @param {string} fileName - The filename to save the downloaded file as.
	 */
	const handleDownload = async (fileUrl, fileName) => {
		try {
			const downloadRes = await axios.get(fileUrl, { responseType: "blob" });
			const url = window.URL.createObjectURL(downloadRes.data);

			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", fileName);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Error downloading file:", err);
			toast.error("Failed to download PDF. You can try again.");
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Image to PDF Converter</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label
						className="block mb-2 text-sm font-medium text-foreground"
						htmlFor="multiple_files"
					>
						Upload multiple files
					</label>
					<input
						accept="image/*"
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						id="multiple_files"
						type="file"
						multiple
						onChange={onFileChange}
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "Convert"}
				</button>
			</form>
			{convertedFile && (
				<div className="mt-4 p-4 border rounded-md bg-muted/30">
					<p className="text-sm font-medium text-foreground mb-2">Conversion complete!</p>
					<button
						type="button"
						onClick={() => handleDownload(convertedFile.path, convertedFile.originalname)}
						className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5"
					>
						Download PDF
					</button>
				</div>
			)}
		</div>
	);
};

export default ImageToPdfConverter;