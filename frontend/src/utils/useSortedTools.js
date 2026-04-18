import useAnalytics from "@frontend/utils/useAnalytics";
import { useEffect, useState } from "react";

/**
 * Hook that fetches and sorts tools by their usage count in a given category.
 * It will return the sorted tools, a boolean indicating if the tools are still loading,
 * and an optional error if the fetch failed.
 * @param {string} category - The category of tools to fetch and sort.
 * @param {Tool[]} initialTools - The initial tools to sort, or an empty array if none.
 * @returns {{ tools: Tool[], isLoading: boolean, error: Error | null }}
 */
const useSortedTools = (category, initialTools) => {
	const { getToolStats } = useAnalytics();
	const [tools, setTools] = useState(initialTools || []);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;
		/**
		 * Fetches tool usage stats from the analytics API and sorts the tools by their usage count.
		 * If the fetch fails, it will set the error state.
		 */
		const fetchAndSortTools = async () => {
			// Background fetch: don't block the UI with a loading spinner
			try {
				const stats = await getToolStats(category);

				const usageMap = {};
				if (Array.isArray(stats)) {
					for (const stat of stats) {
						usageMap[stat.toolName] = stat.usageCount;
					}
				}

				const sortedTools = [...initialTools].sort((a, b) => {
					const usageA = usageMap[a.title] || usageMap[a.name] || 0;
					const usageB = usageMap[b.title] || usageMap[b.name] || 0;
					return usageB - usageA;
				});

				if (isMounted) {
					setTools(sortedTools);
					setError(null);
				}
			} catch (error) {
				if (isMounted) {
					console.error("Failed to sort tools:", error);
					setError(error);
				}
			}
		};

		fetchAndSortTools();

		return () => {
			isMounted = false;
		};
	}, [category, getToolStats, initialTools]);

	return { tools, isLoading, error };
};

export default useSortedTools;
