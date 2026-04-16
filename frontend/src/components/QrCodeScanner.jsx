import useAnalytics from "@frontend/utils/useAnalytics";
import jsQR from "jsqr";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component that scans a QR code from an image and displays the result.
 * @component
 * @example
 * <QrCodeScanner />
 */
const QrCodeScanner = () => {
	const { trackToolUsage } = useAnalytics();
	const [qrData, setQrData] = useState("");
	const lastTrackedQrDataRef = useRef("");
	const scanCounterRef = useRef(0);

	/**
	 * Copies the given text to the clipboard.
	 * @param {string} textToCopy
	 * @returns {Promise<void>}
	 */
	const copyToClipboard = async (textToCopy) => {
		try {
			await navigator.clipboard.writeText(textToCopy);
			toast.success("Copied to clipboard!");
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			toast.error("Failed to copy to clipboard. Please try again.");
		}
	};

	/**
	 * Copies the QR code data to the clipboard.
	 */
	const handleCopyToClipboard = () => {
		copyToClipboard(qrData);
	};

	/**
	 * Handles an image upload event.
	 * Reads the uploaded image, decodes the QR code if present, and updates the state with the decoded value.
	 * @param {object} e - The event object passed from the onChange event.
	 */
	const handleImageUpload = async (e) => {
		const file = e.target.files[0];
		if (!file) {
			setQrData("");
			return;
		}

		setQrData("Scanning...");

		// Increment scan counter to track this specific scan
		scanCounterRef.current += 1;
		const currentScanId = scanCounterRef.current;

		const reader = new FileReader();
		/**
		 * Handles the onload event triggered by the FileReader.
		 * Creates a new Image object from the uploaded image data, decodes the QR code if present, and updates the state with the decoded value.
		 * If the image is too large, scales it down while maintaining its aspect ratio.
		 * If the image is unable to be processed, resets the state and displays an error message.
		 * @param {object} event - The event object passed from the onload event.
		 */
		reader.onload = (event) => {
			const img = new Image();
			/**
			 * Handles the onload event triggered by the FileReader.
			 * Creates a new Image object from the uploaded image data, decodes the QR code if present, and updates the state with the decoded value.
			 * If the image is too large, scales it down while maintaining its aspect ratio.
			 * If the image is unable to be processed, resets the state and displays an error message.
			 * @param {object} event - The event object passed from the onload event.
			 */
			img.onload = () => {
				const MAX_DIMENSION = 1000;

				let width = img.width;
				let height = img.height;

				if (width > height) {
					if (width > MAX_DIMENSION) {
						height *= MAX_DIMENSION / width;
						width = MAX_DIMENSION;
					}
				} else {
					if (height > MAX_DIMENSION) {
						width *= MAX_DIMENSION / height;
						height = MAX_DIMENSION;
					}
				}

				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d");
				if (!ctx) {
					// Only update state if this is still the current scan
					if (currentScanId === scanCounterRef.current) {
						setQrData("");
						toast.error("Unable to process the uploaded image.");
					}
					return;
				}
				canvas.width = width;
				canvas.height = height;
				ctx.drawImage(img, 0, 0, width, height);

				const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const code = jsQR(imageData.data, imageData.width, imageData.height);

				// Only accept result if this is still the current scan
				if (currentScanId === scanCounterRef.current) {
					if (code?.data) {
						const decodedValue = String(code.data);
						setQrData(decodedValue);
						if (decodedValue && decodedValue !== lastTrackedQrDataRef.current) {
							lastTrackedQrDataRef.current = decodedValue;
							trackToolUsage("QrCodeScanner", "web");
						}
						toast.success("QR Code detected!");
					} else {
						setQrData("No QR code found.");
						toast.info("No QR code found in the image.");
					}
				}
			};
			/**
			 * Handles an error event triggered by the Image object.
			 * Resets the state to its original value and displays an error message.
			 */
			img.onerror = () => {
				if (currentScanId === scanCounterRef.current) {
					setQrData("");
					toast.error("Failed to decode image.");
				}
			};
			img.src = event.target.result;
		};
		/**
		 * Handles an error event triggered by the FileReader.
		 * Resets the state to its original value and displays an error message if the error occurred during the current scan.
		 */
		reader.onerror = () => {
			if (currentScanId === scanCounterRef.current) {
				setQrData("");
				toast.error("Failed to read file.");
			}
		};
		reader.readAsDataURL(file);
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">QR Code Scanner</h2>
			<div className="mb-4 py-4">
				<label className="block mb-2 text-sm font-medium text-foreground" htmlFor="qr_image">
					Upload QR Code Image
				</label>
				<input
					className="block w-full text-sm text-foreground border border-input rounded-lg cursor-pointer bg-background focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/10"
					id="qr_image"
					type="file"
					accept="image/*"
					onChange={handleImageUpload}
				/>
			</div>

			{qrData && (
				<div className="mt-4">
					<h3 className="text-xl font-bold mb-2">
						QR Code Data:
						<button
							type="button"
							onClick={handleCopyToClipboard}
							className="ml-2 text-sm text-primary hover:underline"
							aria-label="Copy QR code"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 inline-block"
								viewBox="0 0 20 20"
								fill="currentColor"
								role="img"
								aria-labelledby="copy-qr-code-title"
							>
								<title id="copy-qr-code-title">Copy QR code</title>
								<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
								<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
							</svg>
						</button>
					</h3>
					<p className="bg-background border border-input text-foreground text-sm rounded-lg block w-full p-2.5">
						{qrData}
					</p>
				</div>
			)}
		</div>
	);
};

export default QrCodeScanner;
