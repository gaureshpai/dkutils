import { useCallback } from "react";
import axios from "axios";

const useAnalytics = () => {
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getApiBaseUrl = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    if (!baseUrl || !isValidUrl(baseUrl)) {
      console.warn("Invalid or missing VITE_API_BASE_URL, analytics disabled");
      return null;
    }
    return baseUrl;
  };

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

  const getToolStats = useCallback(async (category = null) => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return [];

    try {
      const url = category
        ? `${baseUrl}/api/analytics/stats?category=${encodeURIComponent(category)}`
        : `${baseUrl}/api/analytics/stats`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching tool stats:", error);
      return [];
    }
  }, []);

  const getPopularTools = useCallback(async () => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return {};

    try {
      const response = await axios.get(`${baseUrl}/api/analytics/popular`);
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
