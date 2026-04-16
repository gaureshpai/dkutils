import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * Component for converting PDF files to Word (text extraction).
 *
 * It takes in a PDF file, and uploads it to the API to convert the PDF to Word.
 * It then downloads the converted Word file.
 *
 * @return {JSX.Element} The component.
 */
const PdfToWordConverter = () => {
	const { trackToolUsage } = useAnalytics();
	const [selectedFile, setSelectedFile] = useState(null);
	const [convertedFile, setConvertedFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
	const fileInputRef = useRef(null);

	/**
	 * Handles file change event for PDF to Word converter.
	 * Checks if the selected file is a valid PDF file and if it is within the allowed file size limit.
	 * If the file is valid, sets the selectedFile state to the selected file.
	 * If the file is invalid, displays an error message and resets the selectedFile state.
	 * @param {React.ChangeEvent<HTMLInputElement>} e - The file change event.
	 */
	const onFileChange = (e) => {
		const file = e.target.files[0];
		const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (!file) {
			setSelectedFile(null);
			e.target.value = null;
			return;
		}

		if (file && file.type === "application/pdf") {
			if (file.size > maxFileSize) {
				toast.error(
					`File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. ${isAuthenticated ? "" : "Login for a higher limit (50MB)."}`,
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
	 * Handles form submission for PDF to Word converter.
	 * Prevents the form from reloading the page when submitted.
	 * Checks if a PDF file is selected.
	 * If no PDF file is selected, displays an error message.
	 * If a PDF file is selected, uploads the file to the API to convert the PDF to Word.
	 * Sets the convertedFile state to the API response data.
	 * Tracks the tool usage.
	 * Downloads the converted Word file.
	 * Resets the selectedFile state after the download is completed.
	 * Resets the file input value if the file input ref is available.
	 * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
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

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/pdf-to-word`,
				formData,
			);
			setConvertedFile(res.data);
			trackToolUsage("PdfToWordConverter", "pdf");

			handleDownload(res.data.path, res.data.originalname);
			setSelectedFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error converting PDF to Word. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Downloads a file from a given URL and saves it with the given filename.
	 * @param {string} fileUrl - The URL of the file to download.
	 * @param {string} fileName - The filename to save the file with.
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
			<h2 className="text-2xl font-bold mb-4">PDF to Word Converter</h2>
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
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "Convert to Word"}
				</button>
			</form>
		</div>
	);
};

export default PdfToWordConverter;
