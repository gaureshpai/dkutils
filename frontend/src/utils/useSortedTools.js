import { useEffect, useState } from "react";
import useAnalytics from "./useAnalytics";

const useSortedTools = (category, initialTools) => {
  const { getToolStats } = useAnalytics();
  const [tools, setTools] = useState([]);

  useEffect(() => {
    const fetchAndSortTools = async () => {
      try {
        const stats = await getToolStats(category);

        const usageMap = {};
        stats.forEach((stat) => {
          usageMap[stat.toolName] = stat.usageCount;
        });

        const sortedTools = [...initialTools].sort((a, b) => {
          const usageA = usageMap[a.title] || 0;
          const usageB = usageMap[b.title] || 0;
          return usageB - usageA;
        });

        setTools(sortedTools);
      } catch (error) {
        console.error("Failed to sort tools:", error);
        setTools(initialTools);
      }
    };

    fetchAndSortTools();
  }, [category, getToolStats, initialTools]);

  return tools;
};

export default useSortedTools;
