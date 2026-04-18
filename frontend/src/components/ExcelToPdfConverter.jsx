import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useState } from "react";
import { toast } from "react-toastify";

/**
 * Excel to PDF Converter
 *
 * A utility component that allows users to upload an Excel file and
 * convert it to a PDF file.
 *
 * @returns {JSX.Element} A JSX element representing the component.
 */
const ExcelToPdfConverter = () => {
	const { trackToolUsage } = useAnalytics();

	const [selectedFile, setSelectedFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);

	/**
	 * Handles file selection event.
	 * Checks if the selected file is an Excel file (.xlsx or .csv)
	 * and if it is within the allowed file size limit.
	 * If the file is valid, sets the selectedFile state to the selected file.
	 * If the file is invalid, displays an error message and resets the selectedFile state.
	 * @param {React.ChangeEvent} e The file selection event.
	 */
	const onFileChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			const fileExtension = file.name.split(".").pop().toLowerCase();
			const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

			if (fileExtension === "xlsx" || fileExtension === "csv") {
				if (file.size > maxFileSize) {
					const message = isAuthenticated
						? `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`
						: `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`;
					toast.error(message);
					setSelectedFile(null);
					e.target.value = null;
				} else {
					setSelectedFile(file);
				}
			} else {
				setSelectedFile(null);
				toast.error("Only .xlsx or .csv files are allowed.");
				e.target.value = "";
			}
		}
	};

	/**
	 * Converts an Excel file (.xlsx or .csv) to a PDF file.
	 * Submits the file to the server for conversion and downloads the converted PDF.
	 * @param {React.FormEvent} e The form submission event.
	 * @throws {Error} If the file is invalid or if the conversion fails.
	 */
	const onSubmit = async (e) => {
		e.preventDefault();
		if (!selectedFile) {
			toast.error("Please select a file first.");
			return;
		}

		setLoading(true);
		const formData = new FormData();
		formData.append("excel", selectedFile);

		try {
			void Promise.resolve()
				.then(() => trackToolUsage("ExcelToPdfConverter", "pdf"))
				.catch((analyticsError) => {
					console.error("Failed to track tool usage", analyticsError);
				});
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/excel-to-pdf`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
					responseType: "blob",
				},
			);

			const blob = new Blob([res.data], { type: "application/pdf" });

			const url = window.URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", `converted-${Date.now()}.pdf`);
			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
			toast.success("File converted to PDF successfully!");
		} catch (err) {
			console.error(err);
			let errorMessage = "Error converting file. Please try again.";
			if (err.response?.data instanceof Blob) {
				try {
					const text = await err.response.data.text();
					const parsed = JSON.parse(text);
					errorMessage = parsed.msg || parsed.message || errorMessage;
				} catch {
					// Fall back to generic message
				}
			} else if (err.response?.data?.msg) {
				errorMessage = err.response.data.msg;
			}
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Excel to PDF Converter</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label className="block mb-2 text-sm font-medium text-foreground" htmlFor="single_file">
						Upload an Excel file
					</label>
					<input
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-muted/30 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						id="single_file"
						type="file"
						onChange={onFileChange}
						accept=".xlsx,.csv"
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "Convert to PDF"}
				</button>
			</form>
		</div>
	);
};

export default ExcelToPdfConverter;
