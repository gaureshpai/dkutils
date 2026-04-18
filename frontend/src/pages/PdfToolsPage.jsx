import PdfCompressor from "@frontend/components/PdfCompressor.jsx";
import PdfMerger from "@frontend/components/PdfMerger.jsx";
import PdfPageDeleter from "@frontend/components/PdfPageDeleter.jsx";
import PdfRotator from "@frontend/components/PdfRotator.jsx";
import PdfSplitter from "@frontend/components/PdfSplitter.jsx";
import PdfToExcelConverter from "@frontend/components/PdfToExcelConverter.jsx";
import PdfToTextConverter from "@frontend/components/PdfToTextConverter.jsx";
import PdfToWordConverter from "@frontend/components/PdfToWordConverter.jsx";
import TextToPdfGenerator from "@frontend/components/TextToPdfGenerator.jsx";
import ToolCard from "@frontend/components/ToolCard.jsx";
import useSortedTools from "@frontend/utils/useSortedTools";
import { Helmet } from "react-helmet-async";

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

/**
 * A page containing various PDF tools, such as PDF merger, PDF splitter, PDF compressor, PDF password protector, PDF password remover, PDF to text converter, PDF rotator, and text to PDF generator.
 */
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
				<meta property="og:image" content="https://dkutils.vercel.app/logo.png" />
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
							aria-label="Loading PDF tools"
						>
							<span className="sr-only">Loading PDF tools…</span>
						</div>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{tools.map((tool) => (
							<ToolCard key={tool.title} title={tool.title} description={tool.description}>
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
