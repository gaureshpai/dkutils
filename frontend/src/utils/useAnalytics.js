import axios from "axios";
import { useCallback } from "react";

const toolStatsCache = new Map();
const popularToolsCache = new Map();

/**
 * Hook providing analytics tracking functionality
 *
 * @returns {{ trackToolUsage: (toolName: string, category: string) => Promise<void>, getToolStats: (category: string) => Promise<ToolStats[]>, getPopularTools: () => Promise<{ [category: string]: ToolStats[] }> }}
 */
const useAnalytics = () => {
	/**
	 * Checks if a given string is a valid URL.
	 * @param {string} url - The string to check for validity.
	 * @returns {boolean} true if the string is a valid URL, false otherwise.
	 */
	const isValidUrl = (url) => {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	};

	/**
	 * Returns the base URL for API requests, or null if the VITE_API_BASE_URL environment variable is invalid or missing.
	 * If the variable is invalid or missing, a warning will be logged to the console.
	 * @returns {string|null} The base URL for API requests, or null if analytics is disabled.
	 */
	const getApiBaseUrl = () => {
		const baseUrl = import.meta.env.VITE_API_BASE_URL;
		if (!baseUrl || !isValidUrl(baseUrl)) {
			console.warn("Invalid or missing VITE_API_BASE_URL, analytics disabled");
			return null;
		}
		return baseUrl;
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to allow async operations in the executor for better error handling
	const trackToolUsage = useCallback(async (toolName, category) => {
		const baseUrl = getApiBaseUrl();
		if (!baseUrl) return;

		try {
			await axios.post(`${baseUrl}/api/analytics/track`, {
				toolName,
				category,
			});
		} catch (error) {
			// Silently fail - analytics shouldn't break the app
			console.error("Analytics tracking error:", error);
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to allow async operations in the executor for better error handling
	const getToolStats = useCallback(async (category = null) => {
		const baseUrl = getApiBaseUrl();
		if (!baseUrl) return [];

		const cacheKey = category || "all_stats";
		if (toolStatsCache.has(cacheKey)) {
			return toolStatsCache.get(cacheKey);
		}

		try {
			const url = category
				? `${baseUrl}/api/analytics/stats?category=${encodeURIComponent(category)}`
				: `${baseUrl}/api/analytics/stats`;
			const response = await axios.get(url);

			toolStatsCache.set(cacheKey, response.data);
			return response.data;
		} catch (error) {
			console.error("Error fetching tool stats:", error);
			return [];
		}
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to allow async operations in the executor for better error handling
	const getPopularTools = useCallback(async () => {
		const baseUrl = getApiBaseUrl();
		if (!baseUrl) return {};

		if (popularToolsCache.has("popular")) {
			return popularToolsCache.get("popular");
		}

		try {
			const response = await axios.get(`${baseUrl}/api/analytics/popular`);
			popularToolsCache.set("popular", response.data);
			return response.data;
		} catch (error) {
			console.error("Error fetching popular tools:", error);
			return {};
		}
	}, []);

	return {
		trackToolUsage,
		getToolStats,
		getPopularTools,
	};
};

export default useAnalytics;
