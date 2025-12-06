import React from 'react';
import ToolCard from '../components/ToolCard.jsx';
import LinkShortener from '../components/LinkShortener.jsx';
import QrCodeGenerator from '../components/QrCodeGenerator.jsx';
import QrCodeScanner from '../components/QrCodeScanner.jsx';
import WebsiteScreenshotGenerator from '../components/WebsiteScreenshotGenerator.jsx';
import FaviconExtractor from '../components/FaviconExtractor.jsx';
import UrlRedirectChecker from '../components/UrlRedirectChecker.jsx';
import SeoTools from '../components/SeoTools.jsx';
import JsonXmlConverter from '../components/JsonXmlConverter.jsx';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker.jsx';
import { Helmet } from 'react-helmet-async';

const WebToolsPage = () => {
  return (
    <>
      <Helmet>
        <title>Web Tools - Utility Hub</title>
        <meta name="description" content="Discover essential online tools for web-related tasks: Link Shortener, QR Code Generator, QR Code Scanner, Website Screenshot Generator, Favicon Extractor, URL Redirect Checker, Robots.txt / Sitemap.xml Viewer, JSON <-> XML Converter, and Password Strength Checker. Optimize your web presence and streamline development workflows." />
        <meta name="keywords" content="web tools, URL shortener, QR code generator, QR code scanner, website screenshot, favicon extractor, URL redirect checker, robots.txt viewer, sitemap.xml viewer, JSON XML converter, password strength checker, online web tools, free web tools, SEO tools, web development tools, API tools" />
        <meta property="og:title" content="Web Tools - Utility Hub" />
        <meta property="og:description" content="Discover essential online tools for web-related tasks: Link Shortener, QR Code Generator, QR Code Scanner, Website Screenshot Generator, Favicon Extractor, URL Redirect Checker, Robots.txt / Sitemap.xml Viewer, JSON <-> XML Converter, and Password Strength Checker. Optimize your web presence and streamline development workflows." />
        <meta property="og:image" content="https://dkutils.vercel.app/logo.png" />
        <meta property="og:url" content="https://dkutils.vercel.app/web" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-blue-500">Web Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">A collection of tools for web developers and users.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard title="Link Shortener" description="Shorten long URLs for easier sharing.">
            <LinkShortener />
          </ToolCard>
          <ToolCard title="QR Code Generator" description="Create QR codes from text or URLs.">
            <QrCodeGenerator />
          </ToolCard>
          <ToolCard title="QR Code Scanner" description="Scan QR codes using your device's camera.">
            <QrCodeScanner />
          </ToolCard>
          <ToolCard title="Website Screenshot Generator" description="Capture a full-page screenshot of any website.">
            <WebsiteScreenshotGenerator />
          </ToolCard>
          <ToolCard title="Favicon Extractor" description="Extract favicons from any website.">
            <FaviconExtractor />
          </ToolCard>
          <ToolCard title="URL Redirect Checker" description="Trace URL redirect chains.">
            <UrlRedirectChecker />
          </ToolCard>
          <ToolCard title="Robots.txt / Sitemap.xml Viewer" description="View and validate robots.txt and sitemap.xml files.">
            <SeoTools />
          </ToolCard>
          <ToolCard title="JSON <-> XML Converter" description="Convert between JSON and XML data formats, essential for web service integration and API data transformation.">
            <JsonXmlConverter />
          </ToolCard>
          <ToolCard title="Password Strength Checker" description="Analyze the strength of your password.">
            <PasswordStrengthChecker />
          </ToolCard>
        </div>
      </main>
    </>
  );
};

export default WebToolsPage;