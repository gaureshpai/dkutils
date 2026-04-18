import { AuthContext } from "@frontend/context/AuthContext.jsx";
import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useContext, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component that converts an image to grayscale.
 * It uses the `@imgly/background-removal` package to remove the background.
 * The component accepts an image file as input and returns the image with the background removed as a PNG file.
 * It also tracks the usage of the tool with the `useAnalytics` hook.
 * @param {React.ChangeEvent} e The file selection event.
 * @returns {JSX.Element} The JSX element for the component.
 */
const ImageGrayscaler = () => {
	const { trackToolUsage } = useAnalytics();

	const {
		state: { isAuthenticated },
	} = useContext(AuthContext);
	const [selectedFile, setSelectedFile] = useState(null);
	const [loading, setLoading] = useState(false);

	/**
	 * Handles file selection event.
	 * Checks if the selected file is an image file and if it is within the allowed file size limit.
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

		if (file?.type.startsWith("image/")) {
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
			toast.error("Please select an image file.");
			e.target.value = "";
		}
	};

	/**
	 * Handles form submission event.
	 * Checks if a selected image file is available.
	 * If a selected image file is available, sends a POST request to the API to convert the image to grayscale.
	 * If the request is successful, downloads the image with the background removed as a PNG file and tracks the usage of the tool with the `useAnalytics` hook.
	 * If the request fails, displays an error message.
	 * @param {React.FormEvent} e The form submission event.
	 */
	const onSubmit = async (e) => {
		e.preventDefault();
		if (!selectedFile) {
			toast.error("Please select an image file first.");
			return;
		}

		setLoading(true);
		const formData = new FormData();
		formData.append("image", selectedFile);

		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/image-grayscale`,
				formData,
				{ timeout: 30000 },
			);

			const { path, originalname } = res.data;
			trackToolUsage("ImageGrayscaler", "image");

			const link = document.createElement("a");
			link.href = path;
			link.setAttribute("download", originalname);
			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);
		} catch (err) {
			console.error(err);
			toast.error(
				err.response?.data?.msg || "Error converting image to grayscale. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Image Grayscaler</h2>
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
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "Convert to Grayscale"}
				</button>
			</form>
		</div>
	);
};

export default ImageGrayscaler;
