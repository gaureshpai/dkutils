import useAnalytics from "@frontend/utils/useAnalytics";
import { useEffect, useState } from "react";

const useSortedTools = (category, initialTools) => {
	const { getToolStats } = useAnalytics();
	const [tools, setTools] = useState(initialTools || []);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;
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
