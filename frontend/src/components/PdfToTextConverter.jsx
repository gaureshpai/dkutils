import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component for converting PDF files to text.
 *
 * It allows users to select a PDF file, and then extracts the text from the PDF.
 * The extracted text is then displayed to the user.
 * The component also allows users to download the extracted text as a text file.
 */
const PdfToTextConverter = () => {
	const { trackToolUsage } = useAnalytics();
	const [selectedFile, setSelectedFile] = useState(null);
	const [extractedText, setExtractedText] = useState("");
	const [loading, setLoading] = useState(false);
	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
	const fileInputRef = useRef(null);

	/**
	 * Handles PDF file selection event.
	 * Updates the selected file state variable with the newly selected file.
	 * Also updates the extracted text state variable to an empty string.
	 * If the selected file is not a PDF, or if the file size is larger than the maximum allowed size,
	 * it will display an error message to the user and reset the selected file and extracted text state variables.
	 */
	const onFileChange = (e) => {
		const file = e.target.files[0];
		const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (!file) {
			setSelectedFile(null);
			e.target.value = "";
			return;
		}

		if (file.type === "application/pdf") {
			if (file.size > maxFileSize) {
				toast.error(
					`File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
				);
				setSelectedFile(null);
				e.target.value = null;
			} else {
				setSelectedFile(file);
				setExtractedText("");
			}
		} else {
			setSelectedFile(null);
			setExtractedText("");
			toast.error("Please select a PDF file.");
			e.target.value = "";
		}
	};

	/**
	 * Submits the selected PDF file to the server for text extraction.
	 *
	 * Prevents default form submission behavior and displays an error message if no PDF file is selected
	 * Sets loading state to true while the request is being processed
	 * Resets selected file and extracted text state variables after the request is finished
	 * Calls trackToolUsage with "PdfToTextConverter" and "pdf" as arguments
	 * Calls handleDownload with the extracted text content and a filename of the format "extracted-text-<timestamp>.txt"
	 */
	const onSubmit = async (e) => {
		e.preventDefault();
		if (!selectedFile) {
			toast.error("Please select a PDF file first.");
			return;
		}

		setLoading(true);
		const formData = new FormData();
		formData.append("pdf", selectedFile);

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/pdf-to-text`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);
			const extractedTextContent = res.data;
			trackToolUsage("PdfToTextConverter", "pdf");
			setExtractedText(extractedTextContent);

			handleDownload(extractedTextContent, `extracted-text-${Date.now()}.txt`);
			setSelectedFile(null);
			setExtractedText("");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error extracting text from PDF.");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Downloads a file from the given content and saves it with the given filename.
	 * @param {string} content - The content of the file to download.
	 * @param {string} fileName - The filename to save the downloaded file as.
	 */
	const handleDownload = (content, fileName) => {
		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">PDF to Text Converter</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label className="block mb-2 text-sm font-medium text-foreground" htmlFor="pdf_file">
						Upload PDF
					</label>
					<input
						ref={fileInputRef}
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-muted/30 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						id="pdf_file"
						type="file"
						onChange={onFileChange}
						accept=".pdf"
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Extracting..." : "Extract Text"}
				</button>
			</form>
		</div>
	);
};

export default PdfToTextConverter;
