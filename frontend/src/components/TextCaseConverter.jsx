import useAnalytics from "@frontend/utils/useAnalytics";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component for converting text to different cases (uppercase, lowercase, title case).
 * It takes in a text input, and allows users to select which case to convert to.
 * It also tracks usage with the "TextCaseConverter" tool and "text" type.
 * @returns {JSX.Element} The component.
 */
const TextCaseConverter = () => {
	const { trackToolUsage } = useAnalytics();
	const [text, setText] = useState("");
	const [convertedText, setConvertedText] = useState("");
	const [loading, setLoading] = useState(false);
	const timeoutRef = useRef(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	/**
	 * Handles text change event in the text area, updates the text state with the new value.
	 */
	const handleTextChange = (e) => {
		setText(e.target.value);
	};

	/**
	 * Converts the given text to uppercase with a 500ms delay.
	 * Tracks usage with the "TextCaseConverter" tool and "text" type.
	 */
	const toUpperCase = () => {
		setLoading(true);
		trackToolUsage("TextCaseConverter", "text");
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => {
			setConvertedText(text.toUpperCase());
			setLoading(false);
		}, 500);
	};

	/**
	 * Converts the input text to lowercase.
	 * This function is debounced, meaning it will wait 500ms after the last call before executing the conversion.
	 * The function also tracks usage with the "TextCaseConverter" and "text" arguments.
	 */
	const toLowerCase = () => {
		setLoading(true);
		trackToolUsage("TextCaseConverter", "text");
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => {
			setConvertedText(text.toLowerCase());
			setLoading(false);
		}, 500);
	};

	/**
	 * Converts the input text to title case (first letter of each word capitalized, remaining letters in lowercase).
	 * This function is debounced, meaning it will wait 500ms after the last call before executing the conversion.
	 * The function also tracks usage with the "TextCaseConverter" and "text" arguments.
	 */
	const toTitleCase = () => {
		setLoading(true);
		trackToolUsage("TextCaseConverter", "text");
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		timeoutRef.current = setTimeout(() => {
			setConvertedText(
				text.replace(/\w\S*/g, (txt) => {
					return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
				}),
			);
			setLoading(false);
		}, 500);
	};

	/**
	 * Copies the converted text to the user's clipboard.
	 * @throws {Error} - If there is an error while copying the text.
	 */
	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(convertedText);
			toast.success("Copied to clipboard!");
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			toast.error("Failed to copy to clipboard. Please try again.");
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Text Case Converter</h2>
			<div className="mb-4">
				<textarea
					className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
					rows="5"
					placeholder="Enter text here..."
					value={text}
					onChange={handleTextChange}
				/>
			</div>
			<div className="mb-4">
				<button
					type="button"
					onClick={toUpperCase}
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "UPPERCASE"}
				</button>
				<button
					type="button"
					onClick={toLowerCase}
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "lowercase"}
				</button>
				<button
					type="button"
					onClick={toTitleCase}
					className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
					disabled={loading}
				>
					{loading ? "Converting..." : "Title Case"}
				</button>
			</div>
			{convertedText && (
				<div className="mt-4">
					<h3 className="text-xl font-bold mb-2">
						Converted Text:
						<button
							type="button"
							onClick={copyToClipboard}
							className="ml-2 text-sm text-primary hover:underline"
							aria-label="Copy converted text to clipboard"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 inline-block"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<title>Copy converted text</title>
								<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
								<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
							</svg>
						</button>
					</h3>
					<textarea
						className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
						rows="10"
						readOnly
						value={convertedText}
					/>
				</div>
			)}
		</div>
	);
};

export default TextCaseConverter;
