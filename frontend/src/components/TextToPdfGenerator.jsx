import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component for generating a PDF from a given text.
 * It allows users to input text into a textarea, and then generates a PDF from the text using the API.
 * The generated PDF is then downloaded directly to the user's browser.
 */
const TextToPdfGenerator = () => {
	const { trackToolUsage } = useAnalytics();
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(false);

	/**
	 * Handles text change event in the text area, updates the text state variable with the new value.
	 * @param {React.ChangeEvent} e - The event object.
	 */
	const onChange = (e) => {
		setText(e.target.value);
	};

	/**
	 * Submits the text to the server for PDF generation.
	 * Prevents default form submission behavior and displays an error message if no text is entered
	 * Sets loading state to true while the request is being processed
	 * Resets text state variable after the request is finished
	 * Calls trackToolUsage with "TextToPdfGenerator" and "pdf" as arguments
	 * Calls handleDownload with the generated PDF blob and a filename of the format "converted-text-<timestamp>.pdf"
	 */
	const onSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		trackToolUsage("TextToPdfGenerator", "pdf");
		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/convert/text-to-pdf`,
				{ text },
				{
					responseType: "blob",
				},
			);

			const pdfBlob = new Blob([res.data], { type: "application/pdf" });

			const url = window.URL.createObjectURL(pdfBlob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `converted-text-${Date.now()}.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);

			toast.success("PDF generated successfully!");
			setText("");
		} catch (err) {
			console.error(err);
			toast.error(err.response?.data?.msg || "Error generating PDF from text. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Text to PDF Generator</h2>
			<form onSubmit={onSubmit}>
				<div className="mb-4">
					<label htmlFor="text-input" className="block mb-2 text-sm font-medium text-foreground">
						Text to convert to PDF
					</label>
					<textarea
						id="text-input"
						className="w-full px-3 py-2 placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm bg-background"
						rows="10"
						placeholder="Enter text here..."
						value={text}
						onChange={onChange}
					/>
				</div>
				<button
					type="submit"
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Generating..." : "Generate PDF"}
				</button>
			</form>
		</div>
	);
};

export default TextToPdfGenerator;
