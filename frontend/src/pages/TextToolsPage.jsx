import ToolCard from '../components/ToolCard.jsx';
import TextCaseConverter from '../components/TextCaseConverter.jsx';
import TextDifferenceChecker from '../components/TextDifferenceChecker.jsx';
import Base64TextConverter from '../components/Base64TextConverter.jsx';
import HtmlToMarkdownConverter from '../components/HtmlToMarkdownConverter.jsx';
import MarkdownToHtmlConverter from '../components/MarkdownToHtmlConverter.jsx';
import JsonFormatterValidator from '../components/JsonFormatterValidator.jsx';
import HashGenerator from '../components/HashGenerator.jsx';
import PasswordGenerator from '../components/PasswordGenerator.jsx';
import CsvToJsonConverter from '../components/CsvToJsonConverter.jsx';
import { Helmet } from 'react-helmet-async';


const TextToolsPage = () => {
  return (
    <>
      <Helmet>
        <title>Text Tools - Utility Hub</title>
        <meta name="description" content="Access a versatile collection of online text utilities: Text Case Converter, Text Difference Checker, Base64 Text Converter, HTML to Markdown Converter, Markdown to HTML Converter, JSON Formatter/Validator, Hash Generator, Password Generator, and CSV to JSON Converter. Manipulate, analyze, and transform text data with ease." />
        <meta name="keywords" content="text tools, text case converter, text difference checker, Base64 text converter, HTML to Markdown, Markdown to HTML, JSON formatter, JSON validator, hash generator, password generator, CSV to JSON, online text utilities, free text tools, text manipulation, text analysis, data transformation" />
        <meta property="og:title" content="Text Tools - Utility Hub" />
        <meta property="og:description" content="Access a versatile collection of online text utilities: Text Case Converter, Text Difference Checker, Base64 Text Converter, HTML to Markdown Converter, Markdown to HTML Converter, JSON Formatter/Validator, Hash Generator, Password Generator, and CSV to JSON Converter. Manipulate, analyze, and transform text data with ease." />
        <meta property="og:image" content="https://dkutils.vercel.app/logo.png" />
        <meta property="og:url" content="https://dkutils.vercel.app/text" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-blue-500">Text Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">A set of utilities for text processing and manipulation.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard title="Text Case Converter" description="Convert text to various case formats (e.g., uppercase, lowercase, title case).">
            <TextCaseConverter />
          </ToolCard>
          <ToolCard title="Text Difference Checker" description="Compare two texts and highlight the differences.">
            <TextDifferenceChecker />
          </ToolCard>
          <ToolCard title="Base64 Text Converter" description="Encode or decode text to/from Base64.">
            <Base64TextConverter />
          </ToolCard>
          <ToolCard title="HTML to Markdown Converter" description="Convert HTML content to Markdown format.">
            <HtmlToMarkdownConverter />
          </ToolCard>
          <ToolCard title="Markdown to HTML Converter" description="Convert Markdown content to HTML format.">
            <MarkdownToHtmlConverter />
          </ToolCard>
          <ToolCard title="JSON Formatter/Validator" description="Format and validate JSON data.">
            <JsonFormatterValidator />
          </ToolCard>
          <ToolCard title="Hash Generator" description="Generate various cryptographic hashes (e.g., MD5, SHA1, SHA256).">
            <HashGenerator />
          </ToolCard>
          <ToolCard title="Password Generator" description="Generate strong, random passwords.">
            <PasswordGenerator />
          </ToolCard>
          <ToolCard title="CSV to JSON Converter" description="Convert CSV (Comma Separated Values) data to JSON (JavaScript Object Notation) format.">
            <CsvToJsonConverter />
          </ToolCard>
        </div>
      </main>
    </>
  );
};

export default TextToolsPage;