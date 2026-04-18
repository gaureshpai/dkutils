import useAnalytics from "@frontend/utils/useAnalytics";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

/**
 * A component to check the strength of a given password.
 *
 * It uses the VITE API to check the strength and displays the result
 * in a colored label.
 *
 * It also provides feedback in the form of a bulleted list.
 *
 * @returns {JSX.Element} The component to render
 */
const PasswordStrengthChecker = () => {
	const [password, setPassword] = useState("");
	const [strengthScore, setStrengthScore] = useState(0);
	const [feedback, setFeedback] = useState([]);
	const [loading, setLoading] = useState(false);
	const { trackToolUsage } = useAnalytics();
	const requestIdRef = useRef(0);
	const currentAbortControllerRef = useRef(null);
	const debounceTimeoutRef = useRef(null);

	const checkStrength = useCallback(async (pwd) => {
		if (pwd.length === 0) {
			setStrengthScore(0);
			setFeedback([]);
			return;
		}

		// Cancel previous request if it exists
		if (currentAbortControllerRef.current) {
			currentAbortControllerRef.current.abort();
		}

		// Create new AbortController for this request
		const abortController = new AbortController();
		currentAbortControllerRef.current = abortController;

		// Increment request ID to track this specific request
		requestIdRef.current += 1;
		const currentRequestId = requestIdRef.current;

		setLoading(true);
		try {
			const res = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/password-strength`,
				{ password: pwd },
				{ signal: abortController.signal },
			);

			// Only update state if this is still the current request
			if (currentRequestId === requestIdRef.current) {
				setStrengthScore(res.data.score);
				setFeedback(res.data.feedback);
			}
		} catch (err) {
			// Only show error if this is still the current request and it wasn't aborted
			if (currentRequestId === requestIdRef.current && !axios.isCancel(err)) {
				console.error("Error checking password strength:", err);
				setStrengthScore(0);
				setFeedback(["Error checking strength."]);
				toast.error("Failed to check password strength.");
			}
		} finally {
			// Only clear loading if this is still the current request
			if (currentRequestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, []);

	const checkStrengthRef = useRef(checkStrength);

	useEffect(() => {
		checkStrengthRef.current = checkStrength;
	}, [checkStrength]);

	const debouncedCheckStrengthRef = useRef(
		((delay) => {
			return (...args) => {
				// Clear previous timeout
				if (debounceTimeoutRef.current) {
					clearTimeout(debounceTimeoutRef.current);
				}
				// Set new timeout and store its ID
				debounceTimeoutRef.current = setTimeout(() => {
					checkStrengthRef.current(...args);
					debounceTimeoutRef.current = null;
				}, delay);
			};
		})(500),
	);

	// Track usage once on component mount
	useEffect(() => {
		trackToolUsage("PasswordStrengthChecker", "web");
	}, [trackToolUsage]);

	// Cleanup: cancel pending requests and clear debounce timeout on unmount
	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
			if (currentAbortControllerRef.current) {
				currentAbortControllerRef.current.abort();
			}
		};
	}, []);

	useEffect(() => {
		debouncedCheckStrengthRef.current(password);
	}, [password]);

	/**
	 * Returns a color class based on the password strength score.
	 *
	 * @param {number} score - The password strength score.
	 * @return {string} - A color class.
	 */
	const getStrengthColor = (score) => {
		if (score === 0) return "text-muted-foreground";
		if (score <= 2) return "text-destructive";
		if (score === 3) return "text-chart-4";
		if (score >= 4) return "text-chart-2";
		return "text-muted-foreground";
	};

	/**
	 * Returns a text representation of the password strength score.
	 * @param {number} score - The password strength score.
	 * @return {string} - A text representation of the password strength score.
	 */
	const getStrengthText = (score) => {
		if (score === 0) return "Very Weak";
		if (score === 1) return "Weak";
		if (score === 2) return "Moderate";
		if (score === 3) return "Strong";
		if (score >= 4) return "Very Strong";
		return "Unknown";
	};

	return (
		<div className="container mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Password Strength Checker</h2>
			<div className="mb-4">
				<label htmlFor="passwordInput" className="block mb-2 text-sm font-medium text-foreground">
					Enter Password
				</label>
				<input
					type="password"
					id="passwordInput"
					className="w-full px-3 py-2 bg-background placeholder:text-muted-foreground border border-input rounded-md focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
					placeholder="Type your password here..."
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</div>

			{password.length > 0 && (
				<div className="mt-4 p-4 border rounded-md bg-background shadow">
					<h3 className="text-xl font-bold mb-2">
						Strength:
						<span className={`${getStrengthColor(strengthScore)} ml-2`}>
							{getStrengthText(strengthScore)}
						</span>
					</h3>
					{loading && <p className="text-muted-foreground">Checking strength...</p>}
					{feedback.length > 0 && (
						<ul className="list-disc list-inside text-muted-foreground mt-2">
							{feedback.map((msg, index) => (
								<li key={`${index}-${msg}`}>{msg}</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
};

export default PasswordStrengthChecker;
