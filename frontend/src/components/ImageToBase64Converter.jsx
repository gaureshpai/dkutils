import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useState } from "react";
import { toast } from "react-toastify";

/**
 * ImageToBase64Converter
 *
 * A component that allows users to upload an image and get its Base64 representation.
 *
 * @param {Object} props - The component props.
 * @returns {ReactElement} - The rendered component.
 */
const ImageToBase64Converter = () => {
	const { trackToolUsage } = useAnalytics();

	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
	const [selectedFile, setSelectedFile] = useState(null);
	const [base64String, setBase64String] = useState("");
	const [loading, setLoading] = useState(false);

	/**
	 * Handles file change event for image to base64 converter.
	 * Checks if the selected file is an image file and if it is within the allowed file size limit.
	 * If the file is valid, sets the selectedFile state to the selected file and resets the base64String state.
	 * If the file is invalid, displays an error message and resets the selectedFile and base64String states.
	 * @param {React.ChangeEvent<HTMLInputElement>} e - The file change event.
	 */
	const onFileChange = (e) => {
		const file = e.target.files[0];
		const maxFileSize = isAuthenticated ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

		if (file?.type.startsWith("image/")) {
			if (file.size > maxFileSize) {
				const message = isAuthenticated
					? `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`
					: `File too large: ${file.name}. Maximum size is ${maxFileSize / (1024 * 1024)}MB. Login for a higher limit (50MB).`;
				toast.error(message);
				setSelectedFile(null);
				setBase64String("");
				e.target.value = null;
			} else {
				setSelectedFile(file);
				setBase64String("");
			}
		} else {
			setSelectedFile(null);
			setBase64String("");
			toast.error("Please select an image file.");
			e.target.value = "";
		}
	};

	/**
	 * Submits the image to base64 converter form.
	 * Converts the selected image to Base64, and downloads the converted image as a text file.
	 * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
	 */
	const onSubmit = async (e) => {
		e.preventDefault();
		if (!selectedFile || loading) {
			return;
		}

		const file = selectedFile;

		setLoading(true);
		const formData = new FormData();
		formData.append("image", file);

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/image-to-base64`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);
			if (file !== selectedFile) {
				return;
			}
			const base64 = res.data.base64;
			setBase64String(base64);

			handleDownload(base64, `image-base64-${Date.now()}.txt`);
			trackToolUsage("ImageToBase64Converter", "image");
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error converting image to Base64. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	/**
	 * Downloads the given content as a file with the given filename.
	 * @param {string} content - The content to download as a file.
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
			<h2 className="text-2xl font-bold mb-4">Image to Base64 Converter</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label className="block mb-2 text-sm font-medium text-foreground" htmlFor="image_file">
						Upload Image
					</label>
					<input
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-muted/30 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						id="image_file"
						type="file"
						onChange={onFileChange}
						accept="image/*"
						disabled={loading}
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "Convert to Base64"}
				</button>
			</form>
		</div>
	);
};

export default ImageToBase64Converter;
