import { useCallback } from "react";
import axios from "axios";

const useAnalytics = () => {
  const trackToolUsage = useCallback(async (toolName, category) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/api/analytics/track`,
        {
          toolName,
          category,
        },
      );
    } catch (error) {
      // Silently fail - analytics shouldn't break the app
      console.error("Analytics tracking error:", error);
    }
  }, []);

  const getToolStats = useCallback(async (category = null) => {
    try {
      const url = category
        ? `${import.meta.env.VITE_API_BASE_URL}/api/analytics/stats?category=${encodeURIComponent(category)}`
        : `${import.meta.env.VITE_API_BASE_URL}/api/analytics/stats`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching tool stats:", error);
      return [];
    }
  }, []);

  const getPopularTools = useCallback(async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/analytics/popular`,
      );
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
