import useAnalytics from "@frontend/utils/useAnalytics";
import { removeBackground } from "@imgly/background-removal";
import { useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component that removes the background from an image.
 * It uses the `@imgly/background-removal` package to remove the background.
 * The component accepts an image file as input and returns the image with the background removed.
 * It also tracks the usage of the tool with the `useAnalytics` hook.
 */
const ImageBackgroundRemover = () => {
	const { trackToolUsage } = useAnalytics();
	const [selectedFile, setSelectedFile] = useState(null);
	const [loading, setLoading] = useState(false);

	/**
	 * Handles file change event from the input file element.
	 * If the selected file is not an image, it will show an error message and reset the input file element.
	 * If the selected file is an image, it will set the selectedFile state to the selected file.
	 */
	const handleFileChange = (event) => {
		const file = event.target.files?.[0];
		if (!file) {
			setSelectedFile(null);
			return;
		}

		if (!file.type.startsWith("image/")) {
			toast.error("Please upload a valid image file.");
			event.target.value = "";
			setSelectedFile(null);
			return;
		}

		setSelectedFile(file);
	};

	/**
	 * Handles form submission event.
	 * Removes the background from the selected image file using `@imgly/background-removal`.
	 * Downloads the image with the background removed as a PNG file.
	 * Tracks the usage of the tool with the `useAnalytics` hook.
	 * Toasts success or error messages based on the outcome.
	 */
	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!selectedFile) {
			toast.error("Please select an image first.");
			return;
		}

		setLoading(true);
		try {
			const blob = await removeBackground(selectedFile);
			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = objectUrl;
			link.download = `${selectedFile.name.replace(/\.[^.]+$/, "")}-no-bg.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(objectUrl);
			void trackToolUsage("ImageBackgroundRemover", "image");
			toast.success("Background removed successfully.");
		} catch (error) {
			console.error(error);
			toast.error("Failed to remove the image background.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Background Remover</h2>
			<form onSubmit={handleSubmit}>
				<div className="mb-4">
					<label
						className="block mb-2 text-sm font-medium text-foreground"
						htmlFor="background_remover_file"
					>
						Upload an image
					</label>
					<input
						id="background_remover_file"
						type="file"
						accept="image/*"
						className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
						onChange={handleFileChange}
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 focus:outline-none"
					disabled={loading}
				>
					{loading ? "Removing..." : "Remove Background"}
				</button>
			</form>
		</div>
	);
};

export default ImageBackgroundRemover;
