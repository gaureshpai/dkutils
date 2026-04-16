import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component for merging multiple PDF files.
 * The component takes care of handling the file selection event, validating the selected files, submitting the selected files to the server for merging, and downloading the merged PDF file.
 * @prop trackToolUsage {function} - A function to track the usage of the component.
 * @prop {React.ChangeEvent<HTMLInputElement>} onFileChange - The file selection event.
 * @prop {React.FormEvent} onSubmit - The form submission event.
 */
const PdfMerger = () => {
	const { trackToolUsage } = useAnalytics();
	const [selectedFiles, setSelectedFiles] = useState([]);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const auth = useContext(AuthContext);
	const isAuthenticated = auth.state?.isAuthenticated ?? false;
	const maxUploadSize =
		auth.state?.limits?.maxUploadSizeBytes ??
		auth.state?.uploadLimit ??
		(isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024);
	const [convertedFile, setConvertedFile] = useState(null);
	const fileInputRef = useRef(null);

	/**
	 * Handles file selection event for PDF merger.
	 * Checks if the selected files are valid PDF files and if they are within the allowed file size limit.
	 * If the files are valid, sets the selectedFiles state to the valid files.
	 * If the files are invalid, displays an error message and resets the selectedFiles state.
	 * @param {React.ChangeEvent<HTMLInputElement>} e - The file selection event.
	 */
	const onFileChange = (e) => {
		const files = Array.from(e.target.files);
		const validFiles = [];
		let hasError = false;

		for (const file of files) {
			if (file.type !== "application/pdf") {
				toast.error(`Invalid file type: ${file.name}. Only PDF files are allowed.`);
				hasError = true;
				break;
			}
			if (file.size > maxUploadSize) {
				toast.error(
					isAuthenticated
						? `File too large: ${file.name}. Maximum size is ${maxUploadSize / (1024 * 1024)}MB.`
						: `File too large: ${file.name}. Maximum size is ${maxUploadSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
				);
				hasError = true;
				break;
			}
			validFiles.push(file);
		}

		if (hasError) {
			e.target.value = "";
			setSelectedFiles([]);
			setError("Some files were not added due to size or type restrictions.");
		} else {
			setSelectedFiles(validFiles);
			setError("");
		}
	};

	/**
	 * Submits the selected PDF files to the server for merging.
	 * @param {React.FormEvent} e The form submission event.
	 */
	const onSubmit = async (e) => {
		e.preventDefault();

		if (selectedFiles.length === 0) {
			toast.error("Please select at least one PDF file.");
			return;
		}

		const formData = new FormData();
		for (const file of selectedFiles) {
			formData.append("pdfs", file);
		}

		setLoading(true);
		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/merge-pdfs`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);
			setConvertedFile(res.data);

			handleDownload(res.data.path, res.data.originalname);
			toast.success("PDFs merged successfully!");
			trackToolUsage("PdfMerger", "pdf");
			setSelectedFiles([]);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error merging PDFs. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Downloads a file from the given URL and saves it with the given filename.
	 * @param {string} fileUrl - The URL of the file to download.
	 * @param {string} fileName - The filename to save the downloaded file as.
	 */
	const handleDownload = (fileUrl, fileName) => {
		const link = document.createElement("a");
		link.href = fileUrl;
		link.setAttribute("download", fileName);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">PDF Merger</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label
						className="block mb-2 text-sm font-medium text-foreground"
						htmlFor="multiple_files"
					>
						Upload multiple PDF files
					</label>
					<input
						ref={fileInputRef}
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						id="multiple_files"
						type="file"
						multiple
						onChange={onFileChange}
						accept=".pdf"
					/>
					<p className="text-sm text-muted-foreground mt-2">
						Maximum file size: {maxUploadSize / (1024 * 1024)}MB.
						{!isAuthenticated ? " Login to unlock the higher upload limit." : ""}
					</p>
					{error && <p className="text-destructive text-sm mt-2">{error}</p>}
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Merging..." : "Merge PDFs"}
				</button>
			</form>
		</div>
	);
};

export default PdfMerger;
