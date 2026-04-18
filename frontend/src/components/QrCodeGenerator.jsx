import useAnalytics from "@frontend/utils/useAnalytics";
import * as domToImage from "dom-to-image";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component that generates a QR code based on user input.
 * The component provides a form that allows users to enter text or a link.
 * The component also provides a button to generate the QR code and buttons to download the QR code as a PNG and a PDF.
 * The component tracks the usage of the tool with the `useAnalytics` hook.
 *
 * @returns {JSX.Element} A JSX element representing the QR Code Generator tool.
 */
const QrCodeGenerator = () => {
	const { trackToolUsage } = useAnalytics();
	const [text, setText] = useState("");
	const [qrValue, setQrValue] = useState("");
	const [loading, setLoading] = useState(false);
	const qrCodeRef = useRef(null);

	/**
	 * Handles changes to the text input field.
	 * Sets the text state to the new value.
	 * @param {React.ChangeEvent} e - The event object passed from the onChange event.
	 */
	const handleChange = (e) => {
		setText(e.target.value);
	};

	/**
	 * Generates a QR code based on the current text state.
	 * If the text state is empty, displays an error message and returns.
	 * Otherwise, sets the loading state to true, tracks the usage of the tool with the `useAnalytics` hook,
	 * and sets the QR value state to the current text state after a 500ms delay.
	 */
	const generateQrCode = () => {
		if (!text.trim()) {
			toast.error("Please enter some text to generate a QR code.");
			return;
		}

		setLoading(true);
		trackToolUsage("QrCodeGenerator", "web");
		setTimeout(() => {
			setQrValue(text);
			setLoading(false);
			toast.success("QR code generated successfully!");
		}, 500);
	};

	/**
	 * Downloads the current QR code as a PNG image.
	 * If the QR code element is not available (i.e. the QR code has not been generated),
	 * displays an error message and returns. Otherwise, downloads the QR code as a PNG image
	 * and displays a success message.
	 */
	const downloadPng = () => {
		if (qrCodeRef.current) {
			domToImage
				.toPng(qrCodeRef.current)
				.then((dataUrl) => {
					const link = document.createElement("a");
					link.href = dataUrl;
					link.download = "qrcode.png";
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					toast.success("QR code downloaded as PNG!");
				})
				.catch((error) => {
					console.error("Error downloading PNG:", error);
					toast.error("Failed to download QR code as PNG.");
				});
		} else {
			toast.error("Please generate a QR code first.");
		}
	};

	/**
	 * Downloads the current QR code as a PDF document.
	 * If the QR code element is not available (i.e. the QR code has not been generated),
	 * displays an error message and returns. Otherwise, downloads the QR code as a PDF document
	 * and displays a success message.
	 */
	const downloadPdf = () => {
		if (qrCodeRef.current) {
			domToImage
				.toPng(qrCodeRef.current)
				.then((dataUrl) => {
					const pdf = new jsPDF({ unit: "mm", format: [100, 100] });
					const imgData = dataUrl;
					const imgProps = pdf.getImageProperties(imgData);
					const pdfWidth = pdf.internal.pageSize.getWidth();
					const pdfHeight = pdf.internal.pageSize.getHeight();

					const margin = 10;
					const imgDisplayWidth = pdfWidth - 2 * margin;
					const imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;

					const x = margin;
					const y = (pdfHeight - imgDisplayHeight) / 2;

					pdf.addImage(imgData, "PNG", x, y, imgDisplayWidth, imgDisplayHeight);
					pdf.save("qrcode.pdf");
					toast.success("QR code downloaded as PDF!");
				})
				.catch((error) => {
					console.error("Error downloading PDF:", error);
					toast.error("Failed to download QR code as PDF.");
				});
		} else {
			toast.error("Please generate a QR code first.");
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">QR Code Generator</h2>
			<div className="mb-4">
				<input
					type="text"
					className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
					placeholder="Enter text or link..."
					value={text}
					onChange={handleChange}
				/>
			</div>
			<button
				type="button"
				onClick={generateQrCode}
				className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
				disabled={loading}
			>
				{loading ? "Generating..." : "Generate QR Code"}
			</button>

			{qrValue && (
				<div className="mt-4 flex flex-col items-center">
					<div ref={qrCodeRef} className="mb-4">
						<QRCodeSVG value={qrValue} size={256} level="H" />
					</div>
					<div className="flex space-x-4">
						<button
							type="button"
							onClick={downloadPng}
							className="text-secondary-foreground bg-secondary hover:bg-secondary/80 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 dark:hover:bg-secondary focus:outline-none "
						>
							Download PNG
						</button>
						<button
							type="button"
							onClick={downloadPdf}
							className="text-destructive-foreground bg-destructive hover:bg-destructive/90 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-red-600 dark:hover:bg-destructive focus:outline-none dark:focus:ring-red-800"
						>
							Download PDF
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default QrCodeGenerator;
