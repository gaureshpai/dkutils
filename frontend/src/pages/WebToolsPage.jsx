import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import ToolCard from "../components/ToolCard.jsx";
import LinkShortener from "../components/LinkShortener.jsx";
import QrCodeGenerator from "../components/QrCodeGenerator.jsx";
import QrCodeScanner from "../components/QrCodeScanner.jsx";
import WebsiteScreenshotGenerator from "../components/WebsiteScreenshotGenerator.jsx";
import FaviconExtractor from "../components/FaviconExtractor.jsx";
import UrlRedirectChecker from "../components/UrlRedirectChecker.jsx";
import SeoTools from "../components/SeoTools.jsx";
import JsonXmlConverter from "../components/JsonXmlConverter.jsx";
import PasswordStrengthChecker from "../components/PasswordStrengthChecker.jsx";
import useAnalytics from "../utils/useAnalytics";

const WebToolsPage = () => {
  const { getToolStats } = useAnalytics();
  const [tools, setTools] = useState([]);

  useEffect(() => {
    const fetchAndSortTools = async () => {
      const initialTools = [
        {
          title: "Link Shortener",
          description: "Shorten long URLs for easier sharing.",
          component: <LinkShortener />,
        },
        {
          title: "QR Code Generator",
          description: "Create QR codes from text or URLs.",
          component: <QrCodeGenerator />,
        },
        {
          title: "QR Code Scanner",
          description: "Scan QR codes using your device's camera.",
          component: <QrCodeScanner />,
        },
        {
          title: "Website Screenshot Generator",
          description: "Capture a full-page screenshot of any website.",
          component: <WebsiteScreenshotGenerator />,
        },
        {
          title: "Favicon Extractor",
          description: "Extract favicons from any website.",
          component: <FaviconExtractor />,
        },
        {
          title: "URL Redirect Checker",
          description: "Trace URL redirect chains.",
          component: <UrlRedirectChecker />,
        },
        {
          title: "Robots.txt / Sitemap.xml Viewer",
          description: "View and validate robots.txt and sitemap.xml files.",
          component: <SeoTools />,
        },
        {
          title: "JSON <-> XML Converter",
          description:
            "Convert between JSON and XML data formats, essential for web service integration and API data transformation.",
          component: <JsonXmlConverter />,
        },
        {
          title: "Password Strength Checker",
          description: "Analyze the strength of your password.",
          component: <PasswordStrengthChecker />,
        },
      ];

      try {
        const stats = await getToolStats("web");

        // Create a map of usage counts
        const usageMap = {};
        stats.forEach((stat) => {
          usageMap[stat.toolName] = stat.usageCount;
        });

        // Sort tools based on usage count (descending)
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
  }, [getToolStats]);

  return (
    <>
      <Helmet>
        <title>Web Tools - dkutils</title>
        <meta
          name="description"
          content="Discover essential online tools for web-related tasks: Link Shortener, QR Code Generator, QR Code Scanner, Website Screenshot Generator, Favicon Extractor, URL Redirect Checker, Robots.txt / Sitemap.xml Viewer, JSON <-> XML Converter, and Password Strength Checker. Optimize your web presence and streamline development workflows."
        />
        <meta
          name="keywords"
          content="web tools, URL shortener, QR code generator, QR code scanner, website screenshot, favicon extractor, URL redirect checker, robots.txt viewer, sitemap.xml viewer, JSON XML converter, password strength checker, online web tools, free web tools, SEO tools, web development tools, API tools"
        />
        <meta property="og:title" content="Web Tools - dkutils" />
        <meta
          property="og:description"
          content="Discover essential online tools for web-related tasks: Link Shortener, QR Code Generator, QR Code Scanner, Website Screenshot Generator, Favicon Extractor, URL Redirect Checker, Robots.txt / Sitemap.xml Viewer, JSON <-> XML Converter, and Password Strength Checker. Optimize your web presence and streamline development workflows."
        />
        <meta
          property="og:image"
          content="https://dkutils.vercel.app/logo.png"
        />
        <meta property="og:url" content="https://dkutils.vercel.app/web" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-primary">Web Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">
          A collection of tools for web developers and users.
        </p>

        {tools.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool, index) => (
              <ToolCard
                key={index}
                title={tool.title}
                description={tool.description}
              >
                {tool.component}
              </ToolCard>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default WebToolsPage;
