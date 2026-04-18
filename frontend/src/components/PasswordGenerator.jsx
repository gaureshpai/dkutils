import useAnalytics from "@frontend/utils/useAnalytics";
import { useState } from "react";
import { toast } from "react-toastify";

/**
 * A React component that generates a password based on user input.
 *
 * The component provides a form that allows users to select the length and character types of the password.
 * The component also provides a button to copy the generated password to the clipboard.
 *
 * The component tracks the usage of the tool with the `useAnalytics` hook.
 *
 * @returns {JSX.Element} A JSX element representing the Password Generator tool.
 */
const PasswordGenerator = () => {
	const { trackToolUsage } = useAnalytics();
	const [length, setLength] = useState(12);
	const [includeUppercase, setIncludeUppercase] = useState(true);
	const [includeLowercase, setIncludeLowercase] = useState(true);
	const [includeNumbers, setIncludeNumbers] = useState(true);
	const [includeSymbols, setIncludeSymbols] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	/**
	 * Generates a password based on user input.
	 * The function sets the `password` state to the generated password and the `error` state to an empty string.
	 * If the function fails to generate a password, it sets the `password` state to an empty string and the `error` state to an error message.
	 * The function also sets the `loading` state to `true` while it is generating the password and sets it to `false` when it is done.
	 * The function tracks the usage of the tool with the `useAnalytics` hook.
	 */
	const generatePassword = () => {
		setLoading(true);
		setTimeout(() => {
			try {
				const charsets = {
					uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
					lowercase: "abcdefghijklmnopqrstuvwxyz",
					numbers: "0123456789",
					symbols: "!@#$%^&*()_+-=[]{};:,.<>?",
				};

				let charset = "";
				const requiredChars = [];

				// Add one character from each selected class
				if (includeUppercase) {
					charset += charsets.uppercase;
					requiredChars.push(
						charsets.uppercase.charAt(
							crypto.getRandomValues(new Uint32Array(1))[0] % charsets.uppercase.length,
						),
					);
				}
				if (includeLowercase) {
					charset += charsets.lowercase;
					requiredChars.push(
						charsets.lowercase.charAt(
							crypto.getRandomValues(new Uint32Array(1))[0] % charsets.lowercase.length,
						),
					);
				}
				if (includeNumbers) {
					charset += charsets.numbers;
					requiredChars.push(
						charsets.numbers.charAt(
							crypto.getRandomValues(new Uint32Array(1))[0] % charsets.numbers.length,
						),
					);
				}
				if (includeSymbols) {
					charset += charsets.symbols;
					requiredChars.push(
						charsets.symbols.charAt(
							crypto.getRandomValues(new Uint32Array(1))[0] % charsets.symbols.length,
						),
					);
				}

				if (charset === "") {
					setPassword("");
					setError("Please select at least one option.");
					return;
				}

				const validLength = Number.isNaN(length) || length < 4 ? 4 : Math.min(length, 32);

				// Fill remaining characters from the combined charset
				const randomValues = new Uint32Array(validLength - requiredChars.length);
				crypto.getRandomValues(randomValues);

				const newPassword = [...requiredChars];
				for (let i = 0; i < validLength - requiredChars.length; i++) {
					newPassword.push(charset.charAt(randomValues[i] % charset.length));
				}

				// Shuffle the password array
				for (let i = newPassword.length - 1; i > 0; i--) {
					const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
					[newPassword[i], newPassword[j]] = [newPassword[j], newPassword[i]];
				}

				setPassword(newPassword.join(""));
				setError("");
				trackToolUsage("PasswordGenerator", "web");
			} catch {
				setPassword("");
				setError("Failed to generate password. Please try again.");
			} finally {
				setLoading(false);
			}
		}, 500);
	};

	/**
	 * Copies the current password to the clipboard.
	 *
	 * @throws {Error} - If there is an error while copying the text
	 */
	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(password);
			toast.success("Copied to clipboard!");
		} catch (error) {
			console.error("Failed to copy to clipboard:", error);
			toast.error(`Unable to copy: ${error.message}`);
		}
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Password Generator</h2>
			<div className="mb-4">
				<label htmlFor="lengthInput" className="block mb-2 text-sm font-medium text-foreground">
					Password Length:
				</label>
				<input
					id="lengthInput"
					type="number"
					className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
					value={length}
					onChange={(e) => {
						const value = Number.parseInt(e.target.value, 10);
						setLength(Number.isNaN(value) || value < 4 ? 4 : Math.min(value, 32));
					}}
					min="4"
					max="32"
				/>
			</div>
			<div className="mb-4">
				<label className="inline-flex items-center">
					<input
						type="checkbox"
						className="form-checkbox"
						checked={includeUppercase}
						onChange={() => setIncludeUppercase(!includeUppercase)}
					/>
					<span className="ml-2 text-foreground">Include Uppercase Letters</span>
				</label>
			</div>
			<div className="mb-4">
				<label className="inline-flex items-center">
					<input
						type="checkbox"
						className="form-checkbox"
						checked={includeLowercase}
						onChange={() => setIncludeLowercase(!includeLowercase)}
					/>
					<span className="ml-2 text-foreground">Include Lowercase Letters</span>
				</label>
			</div>
			<div className="mb-4">
				<label className="inline-flex items-center">
					<input
						type="checkbox"
						className="form-checkbox"
						checked={includeNumbers}
						onChange={() => setIncludeNumbers(!includeNumbers)}
					/>
					<span className="ml-2 text-foreground">Include Numbers</span>
				</label>
			</div>
			<div className="mb-4">
				<label className="inline-flex items-center">
					<input
						type="checkbox"
						className="form-checkbox"
						checked={includeSymbols}
						onChange={() => setIncludeSymbols(!includeSymbols)}
					/>
					<span className="ml-2 text-foreground">Include Symbols</span>
				</label>
			</div>
			<button
				type="button"
				onClick={generatePassword}
				className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:hover:bg-primary focus:outline-none "
				disabled={loading}
			>
				{loading ? "Generating..." : "Generate Password"}
			</button>
			{error && <p className="text-destructive text-sm mt-2">{error}</p>}

			{password && (
				<div className="mt-4">
					<h3 className="text-xl font-bold mb-2">
						Generated Password:
						<button
							type="button"
							onClick={copyToClipboard}
							className="ml-2 text-sm text-primary hover:underline"
							aria-label="Copy password to clipboard"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5 inline-block"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
								<path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
							</svg>
						</button>
					</h3>
					<textarea
						className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm h-max"
						rows="1"
						readOnly
						value={password}
					/>
				</div>
			)}
		</div>
	);
};

export default PasswordGenerator;
