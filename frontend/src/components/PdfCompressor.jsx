import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component for compressing a PDF file.
 *
 * The component allows the user to select a PDF file, and then uploads the file to the server.
 * The server then compresses the PDF file and returns a download link.
 *
 * The component tracks tool usage and displays a success message upon successful compression.
 */
const PdfCompressor = () => {
	const { trackToolUsage } = useAnalytics();
	const [selectedFile, setSelectedFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [compressionLevel, setCompressionLevel] = useState("medium");
	const { state } = useContext(AuthContext);
	const fileInputRef = useRef(null);

	/**
	 * Handles file selection event.
	 * Checks if the selected file is a PDF file and if it is within the allowed file size limit.
	 * If the file is valid, sets the selectedFile state to the selected file.
	 * If the file is invalid, displays an error message and resets the selectedFile state.
	 * @param {React.ChangeEvent} e The file selection event.
	 */
	const onFileChange = (e) => {
		const file = e.target.files[0];
		const maxFileSize = (state?.isAuthenticated ?? false) ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (!file || e.target.files.length === 0) {
			setSelectedFile(null);
			e.target.value = null;
			return;
		}

		if (file.type === "application/pdf") {
			if (file.size > maxFileSize) {
				toast.error(
					isAuthenticated
						? `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`
						: `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
				);
				setSelectedFile(null);
				e.target.value = null;
			} else {
				setSelectedFile(file);
			}
		} else {
			toast.error("Please select a PDF file.");
			setSelectedFile(null);
			e.target.value = null;
		}
	};

	/**
	 * Handles form submission event.
	 * Checks if a PDF file is selected, and if so, sends a POST request to the server to compress the PDF file.
	 * The server then returns a download link, which is used to download the compressed PDF file.
	 * Tracks tool usage and displays a success message upon successful compression.
	 * If an error occurs during compression, displays an error message.
	 * @param {React.FormEvent} e The form submission event.
	 */
	const onSubmit = async (e) => {
		e.preventDefault();

		if (!selectedFile) {
			toast.error("Please select a PDF file.");
			return;
		}

		setLoading(true);
		const formData = new FormData();
		formData.append("pdf", selectedFile);
		formData.append("compressionLevel", compressionLevel);

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/compress-pdf`,
				formData,
			);

			const { path, originalname, compressionRatio, message } = res.data;

			// Show compression success message
			toast.success(message);
			trackToolUsage("PdfCompressor", "pdf");

			// Create download link
			const link = document.createElement("a");
			link.href = path;
			link.setAttribute("download", originalname);
			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);

			setSelectedFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error compressing PDF. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">PDF Compressor</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label className="block mb-2 text-sm font-medium text-foreground" htmlFor="single_file">
						Upload a PDF file
					</label>
					<input
						ref={fileInputRef}
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-muted/30 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						id="single_file"
						type="file"
						onChange={onFileChange}
						accept=".pdf"
					/>
				</div>
				<div className="mb-4">
					<label
						className="block mb-2 text-sm font-medium text-foreground"
						htmlFor="compressionLevel"
					>
						Compression Level
					</label>
					<select
						id="compressionLevel"
						value={compressionLevel}
						onChange={(e) => setCompressionLevel(e.target.value)}
						className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
					>
						<option value="low">Low (Minimal compression, best quality)</option>
						<option value="medium">Medium (Balanced compression and quality)</option>
						<option value="high">High (Maximum compression, lower quality)</option>
					</select>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Compressing..." : "Compress PDF"}
				</button>
			</form>
		</div>
	);
};

export default PdfCompressor;
