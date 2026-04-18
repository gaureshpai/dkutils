import useAnalytics from "@frontend/utils/useAnalytics";
import Papa from "papaparse";
import { useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component that converts CSV data to JSON and vice versa.
 * It consists of two input fields for CSV and JSON data, and two buttons to convert the data in either direction.
 * The converted output is displayed in a read-only textarea below the input fields.
 */
const CsvToJsonConverter = () => {
	const { trackToolUsage } = useAnalytics();

	const [csvInput, setCsvInput] = useState("");
	const [jsonInput, setJsonInput] = useState("");
	const [convertedOutput, setConvertedOutput] = useState("");
	const [loading, setLoading] = useState(false);

	/**
	 * Handles changes to the CSV input field.
	 * Sets the CSV input state to the new value, and clears the JSON input and converted output states.
	 * @param {React.ChangeEvent} e - The event object passed from the onChange event.
	 */
	const handleCsvChange = (e) => {
		setCsvInput(e.target.value);
		setJsonInput("");
		setConvertedOutput("");
	};

	/**
	 * Handles changes to the JSON input field.
	 * Sets the JSON input state to the new value, and clears the CSV input and converted output states.
	 * @param {React.ChangeEvent} e - The event object passed from the onChange event.
	 */
	const handleJsonChange = (e) => {
		setJsonInput(e.target.value);
		setCsvInput("");
		setConvertedOutput("");
	};

	/**
	 * Copies the converted CSV/JSON output to the clipboard.
	 * @throws {Error} - If there is an error while copying the text
	 */
	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(convertedOutput);
			toast.success("Copied to clipboard!");
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			toast.error("Failed to copy to clipboard. Please try again.");
		}
	};

	/**
	 * Converts CSV data to JSON.
	 * Triggers when the user wants to convert CSV to JSON.
	 * @returns {Promise<void>} Promise that resolves when the conversion is complete.
	 */
	const convertCsvToJson = () => {
		setLoading(true);
		trackToolUsage("CsvToJsonConverter", "web");
		Papa.parse(csvInput, {
			header: true,
			/**
			 * Callback function called when the CSV to JSON conversion is complete.
			 * If there are errors parsing the CSV, the error message is set as the converted output.
			 * If the conversion is successful, the converted JSON data is set as the converted output.
			 * @param {Object} results - The result of the CSV to JSON conversion.
			 */
			complete: (results) => {
				if (results.errors?.length) {
					setConvertedOutput(`Error parsing CSV: ${results.errors[0].message}`);
					setLoading(false);
					return;
				}
				setConvertedOutput(JSON.stringify(results.data, null, 2));
				setLoading(false);
			},
			/**
			 * Handles errors while parsing CSV data.
			 * @param {Error} err Error object
			 */
			error: (err) => {
				setConvertedOutput(`Error parsing CSV: ${err.message}`);
				setLoading(false);
			},
		});
	};

	/**
	 * Converts JSON data to CSV string.
	 *
	 * @returns {Promise<string>} Promise that resolves with a CSV string.
	 */
	const convertJsonToCsv = () => {
		setLoading(true);
		trackToolUsage("CsvToJsonConverter", "web");
		try {
			const jsonData = JSON.parse(jsonInput);
			const csv = Papa.unparse(jsonData);
			setConvertedOutput(csv);
		} catch (e) {
			setConvertedOutput(`Error parsing JSON: ${e.message}`);
		}
		setLoading(false);
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">CSV &lt;-&gt; JSON Converter</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label htmlFor="csv-input" className="block mb-2 text-sm font-medium text-foreground">
						CSV Input
					</label>
					<textarea
						id="csv-input"
						className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
						rows="10"
						placeholder="Enter CSV here..."
						value={csvInput}
						onChange={handleCsvChange}
					/>
					<div id="csv-input-help" className="text-xs text-muted-foreground mt-1">
						Enter valid CSV data to convert to JSON format
					</div>
					<button
						type="button"
						onClick={convertCsvToJson}
						className="mt-2 text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
						disabled={loading}
						aria-disabled={loading}
					>
						{loading ? "Converting..." : "CSV to JSON"}
					</button>
				</div>
				<div>
					<label htmlFor="json-input" className="block mb-2 text-sm font-medium text-foreground">
						JSON Input
					</label>
					<textarea
						id="json-input"
						className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
						rows="10"
						placeholder="Enter JSON here..."
						value={jsonInput}
						onChange={handleJsonChange}
						aria-describedby="json-input-help"
					/>
					<div id="json-input-help" className="text-xs text-muted-foreground mt-1">
						Enter valid JSON data to convert to CSV format
					</div>
					<button
						type="button"
						onClick={convertJsonToCsv}
						className="mt-2 text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
						disabled={loading}
						aria-disabled={loading}
						aria-label="Convert JSON to CSV"
					>
						{loading ? "Converting..." : "JSON to CSV"}
					</button>
				</div>
			</div>

			{convertedOutput && (
				<div className="mt-4">
					<h3 className="text-xl font-bold mb-2">
						Converted Output:
						<button
							type="button"
							onClick={copyToClipboard}
							className="ml-2 text-sm text-primary hover:underline"
							aria-label="Copy JSON to clipboard"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 inline-block"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<title>Copy to clipboard</title>
								<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
								<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
							</svg>
						</button>
					</h3>
					<textarea
						className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
						rows="10"
						readOnly
						value={convertedOutput}
					/>
				</div>
			)}
		</div>
	);
};

export default CsvToJsonConverter;
