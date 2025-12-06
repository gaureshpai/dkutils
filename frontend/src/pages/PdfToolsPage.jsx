import ToolCard from '../components/ToolCard.jsx';
import PdfMerger from '../components/PdfMerger.jsx';
import PdfSplitter from '../components/PdfSplitter.jsx';
import PdfCompressor from '../components/PdfCompressor.jsx';
import PdfToWordConverter from '../components/PdfToWordConverter.jsx';
import PdfToExcelConverter from '../components/PdfToExcelConverter.jsx';
import TextToPdfGenerator from '../components/TextToPdfGenerator.jsx';
import PdfToTextConverter from '../components/PdfToTextConverter.jsx';
import PdfRotator from '../components/PdfRotator.jsx';
import PdfPageDeleter from '../components/PdfPageDeleter.jsx';
import { Helmet } from 'react-helmet-async';

const PdfToolsPage = () => {
  return (
    <>
      <Helmet>
        <title>PDF Tools - Utility Hub</title>
        <meta name="description" content="Comprehensive tools for managing your PDF documents: merge multiple PDFs, split PDFs by pages, compress PDF file size, protect PDFs with passwords, remove PDF passwords, convert PDF to text, rotate PDF pages, and generate PDFs from plain text. Simplify your PDF workflows with our free online tools." />
        <meta name="keywords" content="PDF tools, PDF merger, PDF splitter, PDF compressor, PDF password protector, PDF password remover, PDF to text converter, PDF rotator, text to PDF generator, online PDF tools, free PDF tools, merge PDF, split PDF, compress PDF, protect PDF, remove PDF password, rotate PDF, convert text to PDF" />
        <meta property="og:title" content="PDF Tools - Utility Hub" />
        <meta property="og:description" content="Comprehensive tools for managing your PDF documents: merge multiple PDFs, split PDFs by pages, compress PDF file size, protect PDFs with passwords, remove PDF passwords, convert PDF to text, rotate PDF pages, and generate PDFs from plain text. Simplify your PDF workflows with our free online tools." />
        <meta property="og:image" content="https://dkutils.vercel.app/logo.png" />
        <meta property="og:url" content="https://dkutils.vercel.app/pdfs" />
      </Helmet>
      <main className="container mx-auto py-10 px-4">
        <h2 className="text-3xl font-bold mb-2 text-blue-500">PDF Tools</h2>
        <p className="text-lg text-muted-foreground mb-6">Manage and convert your PDF documents with ease.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard title="PDF Merger" description="Combine multiple PDF documents into one.">
            <PdfMerger />
          </ToolCard>
          <ToolCard title="PDF Splitter" description="Split a PDF document into multiple pages or ranges.">
            <PdfSplitter />
          </ToolCard>
          <ToolCard title="PDF Compressor" description="Reduce the file size of your PDF documents.">
            <PdfCompressor />
          </ToolCard>
          <ToolCard title="PDF to Word Converter" description="Convert PDF documents to editable Word files.">
            <PdfToWordConverter />
          </ToolCard>
          <ToolCard title="PDF to Excel Converter" description="Convert PDF tables into Excel spreadsheets.">
            <PdfToExcelConverter />
          </ToolCard>
          <ToolCard title="Text to PDF Generator" description="Convert plain text into a PDF document.">
            <TextToPdfGenerator />
          </ToolCard>
          <ToolCard title="PDF to Text Converter" description="Extract text content from PDF documents.">
            <PdfToTextConverter />
          </ToolCard>
          <ToolCard title="PDF Rotator" description="Rotate pages within a PDF document.">
            <PdfRotator />
          </ToolCard>
          <ToolCard title="PDF Page Deleter" description="Delete specific pages from a PDF document.">
            <PdfPageDeleter />
          </ToolCard>
        </div>
      </main>
    </>
  );
};

export default PdfToolsPage;