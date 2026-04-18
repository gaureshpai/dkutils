import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * PdfRotator is a component that allows users to rotate a PDF file by a specified angle.
 *
 * It takes in a PDF file and an optional rotation angle (default is 90 degrees) and returns the rotated PDF file.
 *
 * @returns A JSX element containing a form with input fields for the PDF file and rotation angle, and a button to submit the form and rotate the PDF.
 */
const PdfRotator = () => {
	const { trackToolUsage } = useAnalytics();

	const [selectedFile, setSelectedFile] = useState(null);
	const [rotationAngle, setRotationAngle] = useState(90);
	const [loading, setLoading] = useState(false);
	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
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
		const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (!file) {
			setSelectedFile(null);
			e.target.value = "";
			return;
		}

		if (file && file.type === "application/pdf") {
			if (file.size > maxFileSize) {
				toast.error(
					`File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`,
				);
				setSelectedFile(null);
				e.target.value = null;
			} else {
				setSelectedFile(file);
			}
		} else {
			setSelectedFile(null);
			toast.error("Please select a PDF file.");
			e.target.value = "";
		}
	};

	/**
	 * Handles the form submission event.
	 * Checks if a PDF file is selected first. If not, displays an error message.
	 * If a PDF file is selected, sends a POST request to the backend to rotate the PDF.
	 * If the request is successful, downloads the rotated PDF file and displays a success message.
	 * If the request fails, displays an error message.
	 * @param {React.FormEvent} e The form submission event.
	 */
	const onSubmit = async (e) => {
		e.preventDefault();
		if (!selectedFile) {
			toast.error("Please select a PDF file first.");
			return;
		}

		setLoading(true);
		trackToolUsage("PdfRotator", "pdf");
		const formData = new FormData();
		formData.append("pdf", selectedFile);
		formData.append("angle", rotationAngle);

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/pdf-rotate`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);

			const { path, originalname } = res.data;

			const link = document.createElement("a");
			link.href = path;
			link.setAttribute("download", originalname);
			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);
			toast.success("PDF rotated successfully!");

			setSelectedFile(null);
			setRotationAngle(90);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error rotating PDF. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">PDF Rotator</h2>
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
				<div className="mb-4">
					<label
						htmlFor="rotationAngleSelect"
						className="block mb-2 text-sm font-medium text-foreground"
					>
						Rotation Angle:
					</label>
					<select
						id="rotationAngleSelect"
						className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-background"
						value={rotationAngle}
						onChange={(e) => setRotationAngle(Number.parseInt(e.target.value))}
					>
						<option value={90}>90 Degrees</option>
						<option value={180}>180 Degrees</option>
						<option value={270}>270 Degrees</option>
					</select>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Rotating..." : "Rotate PDF"}
				</button>
			</form>
		</div>
	);
};

export default PdfRotator;
