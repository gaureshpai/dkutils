import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { toast } from 'react-toastify';

const PdfPageDeleter = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pagesToDelete, setPagesToDelete] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPagesToDelete('');
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        setNumPages(pdfDoc.getPageCount());
        toast.success(`PDF loaded successfully! Total pages: ${pdfDoc.getPageCount()}`);
      } catch (err) {
        toast.error('Failed to load PDF. Please ensure it is a valid PDF file.');
        setNumPages(0);
        setPdfFile(null);
      }
    } else {
      toast.error('Please upload a valid PDF file.');
      setPdfFile(null);
      setNumPages(0);
    }
  };

  const handleDeletePages = async () => {
    if (!pdfFile) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    if (pagesToDelete.trim() === '') {
      toast.error('Please specify pages to delete.');
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const pagesToDeleteArray = pagesToDelete
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .flatMap((range) => {
          if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            if (isNaN(start) || isNaN(end) || start < 1 || end > numPages || start > end) {
              throw new Error(`Invalid page range: ${range}`);
            }
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
          } else {
            const pageNum = Number(range);
            if (isNaN(pageNum) || pageNum < 1 || pageNum > numPages) {
              throw new Error(`Invalid page number: ${range}`);
            }
            return [pageNum];
          }
        });

      pagesToDeleteArray.sort((a, b) => b - a);

      const pagesToDeleteSet = new Set(pagesToDeleteArray);
      const pagesToKeep = [];
      for (let i = 0; i < numPages; i++) {
        if (!pagesToDeleteSet.has(i + 1)) {
          pagesToKeep.push(i);
        }
      }

      const newPdfDoc = await PDFDocument.create();
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, pagesToKeep);
      copiedPages.forEach((page) => newPdfDoc.addPage(page));

      const modifiedBytes = await newPdfDoc.save();

      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dkutils_${pdfFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Pages deleted successfully! Download started.');
      setPdfFile(null);
      setNumPages(0);
      setPagesToDelete('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      toast.error(`Error deleting pages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">PDF Page Deleter</h2>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-black" htmlFor="pdfUpload">
          Upload PDF:
        </label>
        <input
          type="file"
          id="pdfUpload"
          accept=".pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {pdfFile && numPages > 0 && (
        <div className="mb-4">
          <p className="text-gray-700">Total pages: {numPages}</p>
          <label className="block mb-2 text-sm font-medium text-black" htmlFor="pagesToDelete">
            Pages to Delete (e.g., 1, 3, 5-7):
          </label>
          <input
            type="text"
            id="pagesToDelete"
            value={pagesToDelete}
            onChange={(e) => setPagesToDelete(e.target.value)}
            className="w-full px-3 py-2 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
            placeholder="e.g., 1, 3, 5-7"
          />
        </div>
      )}

      <button
        onClick={handleDeletePages}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        disabled={!pdfFile || pagesToDelete.trim() === '' || loading}
      >
        {loading ? 'Processing...' : 'Delete Pages'}
      </button>
    </div>
  );
};

export default PdfPageDeleter;