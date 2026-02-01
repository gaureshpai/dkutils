import React from "react";
import { Helmet } from "react-helmet-async";
import ToolCard from "../components/ToolCard.jsx";
import TextCaseConverter from "../components/TextCaseConverter.jsx";
import TextDifferenceChecker from "../components/TextDifferenceChecker.jsx";
import Base64TextConverter from "../components/Base64TextConverter.jsx";
import HtmlToMarkdownConverter from "../components/HtmlToMarkdownConverter.jsx";
import MarkdownToHtmlConverter from "../components/MarkdownToHtmlConverter.jsx";
import JsonFormatterValidator from "../components/JsonFormatterValidator.jsx";
import HashGenerator from "../components/HashGenerator.jsx";
import PasswordGenerator from "../components/PasswordGenerator.jsx";
import CsvToJsonConverter from "../components/CsvToJsonConverter.jsx";
import useSortedTools from "../utils/useSortedTools";

const INITIAL_TOOLS = [
  {
    title: "Text Case Converter",
    description:
      "Convert text to various case formats (e.g., uppercase, lowercase, title case).",
    component: TextCaseConverter,
  },
  {
    title: "Text Difference Checker",
    description: "Compare two texts and highlight the differences.",
    component: TextDifferenceChecker,
  },
  {
    title: "Base64 Text Converter",
    description: "Encode or decode text to/from Base64.",
    component: Base64TextConverter,
  },
  {
    title: "HTML to Markdown Converter",
    description: "Convert HTML content to Markdown format.",
    component: HtmlToMarkdownConverter,
  },
  {
    title: "Markdown to HTML Converter",
    description: "Convert Markdown content to HTML format.",
    component: MarkdownToHtmlConverter,
  },
  {
    title: "JSON Formatter/Validator",
    description: "Format and validate JSON data.",
    component: JsonFormatterValidator,
  },
  {
    title: "Hash Generator",
    description:
      "Generate various cryptographic hashes (e.g., MD5, SHA1, SHA256).",
    component: HashGenerator,
  },
  {
    title: "Password Generator",
    description: "Generate strong, random passwords.",
    component: PasswordGenerator,
  },
  {
    title: "CSV to JSON Converter",
    description:
      "Convert CSV (Comma Separated Values) data to JSON (JavaScript Object Notation) format.",
    component: CsvToJsonConverter,
  },
];

const TextToolsPage = () => {
  const { tools, isLoading } = useSortedTools("text", INITIAL_TOOLS);

  return (
    <>
      <Helmet>
        <title>Text Tools - dkutils</title>
        <meta
          name="description"
          content="Access a versatile collection of online text utilities: Text Case Converter, Text Difference Checker, Base64 Text Converter, HTML to Markdown Converter, Markdown to HTML Converter, JSON Formatter/Validator, Hash Generator, Password Generator, and CSV to JSON Converter. Manipulate, analyze, and transform text data with ease."
        />
        <meta
          name="keywords"
          content="text tools, text case converter, text difference checker, Base64 text converter, HTML to Markdown, Markdown to HTML, JSON formatter, JSON validator, hash generator, password generator, CSV to JSON, online text utilities, free text tools, text manipulation, text analysis, data transformation"
        />
        <meta property="og:title" content="Text Tools - dkutils" />
        <meta
          property="og:description"
          content="Access a versatile collection of online text utilities: Text Case Converter, Text Difference Checker, Base64 Text Converter, HTML to Markdown Converter, Markdown to HTML Converter, JSON Formatter/Validator, Hash Generator, Password Generator, and CSV to JSON Converter. Manipulate, analyze, and transform text data with ease."
        />
        <meta
          property="og:image"
          content="https://dkutils.vercel.app/logo.png"
        />
        <meta property="og:url" content="https://dkutils.vercel.app/text" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-primary">Text Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">
          A set of utilities for text processing and manipulation.
        </p>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
              role="status"
              aria-label="Loading tools"
            >
              <span className="sr-only">Loading tools…</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <ToolCard
                key={tool.title}
                title={tool.title}
                description={tool.description}
              >
                {(() => {
                  const Component = tool.component;
                  return <Component />;
                })()}
              </ToolCard>
            ))}
          </div>
        )}
      </main>
    </>
  );
};

export default TextToolsPage;
