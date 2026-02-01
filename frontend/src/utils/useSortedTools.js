import { useEffect, useState } from "react";
import useAnalytics from "./useAnalytics";

const useSortedTools = (category, initialTools) => {
  const { getToolStats } = useAnalytics();
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAndSortTools = async () => {
      setIsLoading(true);
      try {
        const stats = await getToolStats(category);

        const usageMap = {};
        if (Array.isArray(stats)) {
          stats.forEach((stat) => {
            usageMap[stat.toolName] = stat.usageCount;
          });
        }

        const sortedTools = [...initialTools].sort((a, b) => {
          const usageA = usageMap[a.title] || usageMap[a.name] || 0;
          const usageB = usageMap[b.title] || usageMap[b.name] || 0;
          return usageB - usageA;
        });

        setTools(sortedTools);
        setError(null);
      } catch (error) {
        console.error("Failed to sort tools:", error);
        setError(error);
        setTools(initialTools);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndSortTools();
  }, [category, getToolStats, initialTools]);

  return { tools, isLoading, error };
};

export default useSortedTools;
