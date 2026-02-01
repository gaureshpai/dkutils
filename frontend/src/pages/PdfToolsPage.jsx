import React from "react";
import { Helmet } from "react-helmet-async";
import ToolCard from "../components/ToolCard.jsx";
import PdfMerger from "../components/PdfMerger.jsx";
import PdfSplitter from "../components/PdfSplitter.jsx";
import PdfCompressor from "../components/PdfCompressor.jsx";
import PdfToWordConverter from "../components/PdfToWordConverter.jsx";
import PdfToExcelConverter from "../components/PdfToExcelConverter.jsx";
import TextToPdfGenerator from "../components/TextToPdfGenerator.jsx";
import PdfToTextConverter from "../components/PdfToTextConverter.jsx";
import PdfRotator from "../components/PdfRotator.jsx";
import PdfPageDeleter from "../components/PdfPageDeleter.jsx";
import useSortedTools from "../utils/useSortedTools";

const PDF_TOOL_DEFINITIONS = [
  {
    title: "PDF Merger",
    description: "Combine multiple PDF documents into one.",
    component: PdfMerger,
  },
  {
    title: "PDF Splitter",
    description: "Split a PDF document into multiple pages or ranges.",
    component: PdfSplitter,
  },
  {
    title: "PDF Compressor",
    description: "Reduce the file size of your PDF documents.",
    component: PdfCompressor,
  },
  {
    title: "PDF to Word Converter",
    description: "Convert PDF documents to editable Word files.",
    component: PdfToWordConverter,
  },
  {
    title: "PDF to Excel Converter",
    description: "Convert PDF tables into Excel spreadsheets.",
    component: PdfToExcelConverter,
  },
  {
    title: "Text to PDF Generator",
    description: "Convert plain text into a PDF document.",
    component: TextToPdfGenerator,
  },
  {
    title: "PDF to Text Converter",
    description: "Extract text content from PDF documents.",
    component: PdfToTextConverter,
  },
  {
    title: "PDF Rotator",
    description: "Rotate pages within a PDF document.",
    component: PdfRotator,
  },
  {
    title: "PDF Page Deleter",
    description: "Delete specific pages from a PDF document.",
    component: PdfPageDeleter,
  },
];

const PdfToolsPage = () => {
  const { tools, isLoading } = useSortedTools("pdf", PDF_TOOL_DEFINITIONS);

  return (
    <>
      <Helmet>
        <title>PDF Tools - dkutils</title>
        <meta
          name="description"
          content="Comprehensive tools for managing your PDF documents: merge multiple PDFs, split PDFs by pages, compress PDF file size, protect PDFs with passwords, remove PDF passwords, convert PDF to text, rotate PDF pages, and generate PDFs from plain text. Simplify your PDF workflows with our free online tools."
        />
        <meta
          name="keywords"
          content="PDF tools, PDF merger, PDF splitter, PDF compressor, PDF password protector, PDF password remover, PDF to text converter, PDF rotator, text to PDF generator, online PDF tools, free PDF tools, merge PDF, split PDF, compress PDF, protect PDF, remove PDF password, rotate PDF, convert text to PDF"
        />
        <meta property="og:title" content="PDF Tools - dkutils" />
        <meta
          property="og:description"
          content="Comprehensive tools for managing your PDF documents: merge multiple PDFs, split PDFs by pages, compress PDF file size, protect PDFs with passwords, remove PDF passwords, convert PDF to text, rotate PDF pages, and generate PDFs from plain text. Simplify your PDF workflows with our free online tools."
        />
        <meta
          property="og:image"
          content="https://dkutils.vercel.app/logo.png"
        />
        <meta property="og:url" content="https://dkutils.vercel.app/pdfs" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-primary">PDF Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">
          Manage and convert your PDF documents with ease.
        </p>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"
              role="status"
              aria-label="Loading PDF tools"
            >
              <span className="sr-only">Loading PDF tools…</span>
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

export default PdfToolsPage;
